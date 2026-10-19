import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real action/helper source, with an allowlist of mocked imports.
// There is no DB driver, environment loader, network, or provider in this VM.
function loadSource(relativePath, imports) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unmocked import: ${name}`);
      return imports[name];
    }
  }, { filename: relativePath });
  return module.exports;
}

const validation = loadSource("src/lib/admin/validation.ts", {});
const helpers = loadSource("src/lib/admin/user-mutations.ts", {
  "server-only": {},
  "@/lib/admin/validation": validation
});

class FakeStore {
  constructor(users = [
    { id: 7, role: "owner", is_active: 1 },
    { id: 8, role: "editor", is_active: 1 }
  ]) {
    this.state = {
      users: users.map((user) => ({ ...user, password_hash: "previous-fixture-hash" })),
      sessions: users.flatMap((user) => [{ user_id: user.id, revoked_at: null }, { user_id: user.id, revoked_at: null }]),
      audits: []
    };
    this.tail = Promise.resolve();
    this.connections = [];
    this.lockReads = 0;
    this.failAudit = false;
  }

  async getConnection() {
    const connection = new FakeConnection(this);
    this.connections.push(connection);
    return connection;
  }
}

class FakeConnection {
  constructor(store) { this.store = store; }
  async beginTransaction() { this.begun = true; }

  async execute(sql, values) {
    assert.equal(this.begun, true);
    if (sql === "SELECT id, role, is_active FROM admin_users ORDER BY id FOR UPDATE") {
      // Model a current InnoDB locking read, not a stale transaction snapshot.
      const previous = this.store.tail;
      this.store.tail = new Promise((resolve) => { this.unlock = resolve; });
      await previous;
      this.store.lockReads += 1;
      this.state = structuredClone(this.store.state);
      return [structuredClone(this.state.users)];
    }
    assert.ok(this.state, "writes require the shared account lock");
    if (sql.startsWith("INSERT INTO admin_users")) {
      const id = Math.max(...this.state.users.map((user) => user.id)) + 1;
      this.state.users.push({ id, email: values[0], password_hash: values[1], role: values[2], is_active: 1 });
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (sql.startsWith("UPDATE admin_users")) {
      const id = values.at(-1);
      assert.equal(typeof id, "number", "the DB must not perform ID type coercion");
      const target = this.state.users.find((user) => user.id === id);
      assert.ok(target);
      target.role = values[0];
      target.is_active = values[1];
      if (values.length === 4) target.password_hash = values[2];
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("UPDATE admin_sessions")) {
      this.state.sessions.filter((session) => session.user_id === values[0]).forEach((session) => {
        session.revoked_at = "fixture-revoked";
      });
      return [{ affectedRows: 2 }];
    }
    throw new Error(`Unexpected mock SQL: ${sql}`);
  }

  async commit() {
    this.store.state = this.state;
    this.committed = true;
    this.unlock?.();
    this.unlock = undefined;
  }
  async rollback() {
    this.rolledBack = true;
    this.unlock?.();
    this.unlock = undefined;
  }
  release() {
    assert.equal(this.unlock, undefined, "transaction must finish before releasing the connection");
    this.released = true;
  }
}

function actions(store, actorId = 7) {
  return loadSource("src/app/(admin)/admin/actions/users.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/db": { getDatabasePool: () => store },
    "@/lib/admin/audit": {
      async writeAuditLog(entry, connection) {
        if (store.failAudit) throw new Error("Synthetic audit failure");
        connection.state.audits.push(structuredClone(entry));
      }
    },
    "@/lib/admin/password": { hashPassword: async () => "new-fixture-hash" },
    "@/lib/admin/session": {
      async requireAdminForMutation(roles) {
        assert.deepEqual(Array.from(roles), ["owner"]);
        // This is a trusted server-session snapshot. The transaction must still
        // recheck its current role/active status after acquiring the lock.
        return { id: actorId, email: `owner-${actorId}@example.test`, role: "owner" };
      }
    },
    "@/lib/admin/user-mutations": helpers,
    "@/lib/admin/validation": validation
  });
}

function form({ role = "editor", active = true, password = "" } = {}) {
  const data = new FormData();
  data.set("role", role);
  if (active) data.set("is_active", "1");
  data.set("password", password);
  return data;
}

test("user action rejects string, aggregate, null, nonfinite and unsafe IDs before opening DB", async () => {
  const ids = ["7", "07", "7 ", "7e0", "7 OR 1=1", [7], { id: 7 }, null, undefined, true, 0, -7, 1.5, NaN, Infinity, 9007199254740992, 7n];
  for (const id of ids) {
    const store = new FakeStore();
    const before = structuredClone(store.state);
    const result = await actions(store).updateUserAction(id, {}, form());
    assert.match(result.error, /ID tài khoản/);
    assert.equal(store.connections.length, 0);
    assert.deepEqual(store.state, before);
  }
});

test("last active owner cannot be demoted or deactivated, with inactive owners present", async () => {
  for (const change of [{ role: "editor" }, { role: "owner", active: false }]) {
    const store = new FakeStore([
      { id: 7, role: "owner", is_active: 1 },
      { id: 8, role: "owner", is_active: 0 }
    ]);
    const before = structuredClone(store.state);
    const result = await actions(store).updateUserAction(7, {}, form(change));
    assert.match(result.error, /ít nhất một tài khoản owner/);
    assert.deepEqual(store.state, before);
    assert.equal(store.connections[0].rolledBack, true);
    assert.equal(store.connections[0].released, true);
  }
});

test("owner-count invariant is independent of the self-account guard", () => {
  for (const [role, active] of [["editor", 1], ["owner", 0]]) {
    assert.throws(() => helpers.assertUserUpdateAllowed([
      { id: 7, role: "owner", is_active: 1 },
      { id: 8, role: "owner", is_active: 0 }
    ], 99, 7, role, active), /ít nhất một tài khoản owner/);
  }
});

test("self-demotion/deactivation remains forbidden even when another active owner exists", async () => {
  for (const change of [{ role: "editor" }, { role: "owner", active: false }]) {
    const store = new FakeStore([
      { id: 7, role: "owner", is_active: 1 },
      { id: 8, role: "owner", is_active: 1 }
    ]);
    const before = structuredClone(store.state);
    const result = await actions(store).updateUserAction(7, {}, form(change));
    assert.match(result.error, /không thể tự/);
    assert.deepEqual(store.state, before);
  }
});

test("concurrent owners cannot both demote/deactivate each other using stale authenticated snapshots", async () => {
  for (const change of [{ role: "editor" }, { role: "owner", active: false }]) {
    const store = new FakeStore([
      { id: 7, role: "owner", is_active: 1 },
      { id: 8, role: "owner", is_active: 1 }
    ]);
    const results = await Promise.all([
      actions(store, 7).updateUserAction(8, {}, form(change)),
      actions(store, 8).updateUserAction(7, {}, form(change))
    ]);
    assert.equal(results.filter((result) => result.success).length, 1);
    assert.match(results.find((result) => result.error).error, /không còn quyền owner/);
    assert.equal(store.state.users.filter((user) => user.role === "owner" && user.is_active === 1).length, 1);
    assert.equal(store.state.audits.length, 1);
    assert.equal(store.lockReads, 2);
    const removedOwner = store.state.users.find((user) => user.role !== "owner" || user.is_active !== 1);
    assert.equal(store.state.sessions.filter((session) => session.user_id === removedOwner.id).every((session) => session.revoked_at !== null), true);
    assert.equal(store.connections.every((connection) => connection.released), true);
  }
});

test("stale owner sessions cannot update or create accounts after role/active changes", async () => {
  for (const stale of [{ role: "editor", is_active: 1 }, { role: "owner", is_active: 0 }]) {
    const store = new FakeStore([
      { id: 7, ...stale },
      { id: 8, role: "owner", is_active: 1 }
    ]);
    const before = structuredClone(store.state);
    const api = actions(store);
    assert.match((await api.updateUserAction(8, {}, form())).error, /không còn quyền owner/);
    const data = form({ password: "fixture-password-only" });
    data.set("email", "new@example.test");
    assert.match((await api.createUserAction({}, data)).error, /không còn quyền owner/);
    assert.deepEqual(store.state, before);
    assert.equal(store.connections.every((connection) => connection.rolledBack && connection.released), true);
  }
});

test("owner can update another user and target sessions are revoked for role, active or password changes", async () => {
  for (const change of [{ role: "owner" }, { active: false }, { password: "fixture-password-only" }]) {
    const store = new FakeStore();
    const result = await actions(store).updateUserAction(8, {}, form(change));
    assert.ok(result.success);
    assert.equal(store.state.sessions.filter((session) => session.user_id === 8).every((session) => session.revoked_at !== null), true);
    assert.equal(store.state.sessions.filter((session) => session.user_id === 7).every((session) => session.revoked_at === null), true);
    assert.equal(store.state.audits[0].actorUserId, 7);
    assert.equal(store.state.audits[0].resourceId, 8);
    assert.equal(store.connections[0].committed, true);
    assert.equal(store.connections[0].released, true);
  }
});

test("unchanged role and active status preserve sessions; missing target and invalid role cannot write", async () => {
  const store = new FakeStore();
  const api = actions(store);
  assert.ok((await api.updateUserAction(8, {}, form())).success);
  assert.equal(store.state.sessions.every((session) => session.revoked_at === null), true);
  const before = structuredClone(store.state);
  assert.match((await api.updateUserAction(999, {}, form())).error, /Không tìm thấy/);
  assert.match((await api.updateUserAction(8, {}, form({ role: "admin" }))).error, /không hợp lệ/);
  assert.deepEqual(store.state, before);
});

test("audit failure rolls back account and session changes together", async () => {
  const store = new FakeStore();
  const before = structuredClone(store.state);
  store.failAudit = true;
  const result = await actions(store).updateUserAction(8, {}, form({ role: "owner", password: "fixture-password-only" }));
  assert.equal(result.error, "Không thể lưu thay đổi. Vui lòng thử lại.");
  assert.deepEqual(store.state, before);
  assert.equal(store.connections[0].rolledBack, true);
  assert.equal(store.connections[0].released, true);
});

test("create locks and rechecks the owner, then commits account and audit together", async () => {
  const store = new FakeStore();
  const data = form({ role: "owner", password: "fixture-password-only" });
  data.set("email", "new@example.test");
  assert.ok((await actions(store).createUserAction({}, data)).success);
  assert.equal(store.lockReads, 1);
  assert.equal(store.state.users.length, 3);
  assert.equal(store.state.audits[0].action, "create");
  assert.equal(store.connections[0].committed, true);
});
