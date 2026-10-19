import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/admin/password.ts";
import { recoverOwnerPassword, recoveryFailureMessage } from "../scripts/admin-password-recovery.mjs";

const newPassword = "fixture-only-new-password-2026";
const baseEnv = {
  MYSQL_DATABASE: "solar_shop",
  CONFIRM_ADMIN_PASSWORD_RESET: "solar_shop",
  ADMIN_EMAIL: "owner@example.test",
  ADMIN_RECOVERY_PASSWORD: newPassword
};

class FakeConnection {
  constructor({ owners = [{ id: 7, email: "owner@example.test", is_active: 1 }], database = "solar_shop", migrationCount = 1, bootstrapCount = 1, failAudit = false } = {}) {
    this.state = {
      owners: structuredClone(owners).map((owner) => ({ ...owner, password_hash: "old-hash" })),
      sessions: [{ user_id: 7, revoked_at: null }, { user_id: 7, revoked_at: null }],
      audits: []
    };
    this.database = database;
    this.migrationCount = migrationCount;
    this.bootstrapCount = bootstrapCount;
    this.failAudit = failAudit;
    this.ended = false;
    this.committed = false;
  }

  async query(sql) {
    if (sql.startsWith("SELECT DATABASE()")) return [[{ database_name: this.database }]];
    if (sql.includes("FROM admin_users WHERE role = 'owner' FOR UPDATE")) return [structuredClone(this.state.owners)];
    throw new Error("Unexpected test query");
  }

  async execute(sql, values) {
    if (sql.includes("FROM admin_schema_migrations")) return [[{ count: this.migrationCount }]];
    if (sql.includes("FROM admin_audit_logs") && sql.includes("bootstrap_owner")) return [[{ count: this.bootstrapCount }]];
    if (sql.includes("FROM admin_audit_logs")) {
      return [[{ count: this.state.audits.filter((log) => log.actor_user_id === values[0] && log.action === "owner_password_recovery").length }]];
    }
    if (sql.startsWith("UPDATE admin_users")) {
      const owner = this.state.owners.find((item) => item.id === values[1] && item.is_active === 1);
      if (!owner) return [{ affectedRows: 0 }];
      owner.password_hash = values[0];
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("UPDATE admin_sessions")) {
      const sessions = this.state.sessions.filter((item) => item.user_id === values[0] && item.revoked_at === null);
      sessions.forEach((item) => { item.revoked_at = "recovered"; });
      return [{ affectedRows: sessions.length }];
    }
    if (sql.startsWith("INSERT INTO admin_audit_logs")) {
      if (this.failAudit) throw new Error("Synthetic audit insert failure");
      this.state.audits.push({ actor_user_id: values[0], actor_email: values[1], action: "owner_password_recovery", resource_id: values[2], details: values[3] });
      return [{ affectedRows: 1 }];
    }
    throw new Error("Unexpected test statement");
  }

  async beginTransaction() { this.before = structuredClone(this.state); }
  async commit() { this.committed = true; this.before = undefined; }
  async rollback() { this.state = this.before; this.before = undefined; }
  async end() { this.ended = true; }
}

function run(connection, env = baseEnv, passwordHasher = async () => "fixture-hash") {
  return recoverOwnerPassword({ env, openConnection: async () => connection, hashPassword: passwordHasher });
}

test("missing exact confirmation refuses before opening a connection", async () => {
  let opened = false;
  await assert.rejects(recoverOwnerPassword({ env: { ...baseEnv, CONFIRM_ADMIN_PASSWORD_RESET: undefined }, openConnection: async () => { opened = true; }, hashPassword }), { code: "CONFIRMATION" });
  assert.equal(opened, false);
});

test("wrong database target refuses before opening a connection", async () => {
  let opened = false;
  await assert.rejects(recoverOwnerPassword({ env: { ...baseEnv, MYSQL_DATABASE: "solar_shop_admin_test" }, openConnection: async () => { opened = true; }, hashPassword }), { code: "DB_TARGET" });
  assert.equal(opened, false);
});

test("Vibe Host target requires its own exact confirmation and connected database", async () => {
  const env = { ...baseEnv, MYSQL_DATABASE: "tissolar_mysql" };
  let opened = false;
  await assert.rejects(recoverOwnerPassword({ env, openConnection: async () => { opened = true; }, hashPassword }), { code: "CONFIRMATION" });
  assert.equal(opened, false);

  env.CONFIRM_ADMIN_PASSWORD_RESET = "tissolar_mysql";
  const wrongConnection = new FakeConnection({ database: "solar_shop" });
  await assert.rejects(run(wrongConnection, env), { code: "CONNECTED_DB_TARGET" });
  assert.equal(wrongConnection.committed, false);

  const correctConnection = new FakeConnection({ database: "tissolar_mysql" });
  await run(correctConnection, env);
  assert.equal(correctConnection.committed, true);
});

test("connection to another database is rejected read-only", async () => {
  const connection = new FakeConnection({ database: "other_database" });
  await assert.rejects(run(connection), { code: "CONNECTED_DB_TARGET" });
  assert.equal(connection.committed, false);
  assert.equal(connection.ended, true);
});

test("migration must be applied exactly once", async () => {
  const connection = new FakeConnection({ migrationCount: 0 });
  await assert.rejects(run(connection), { code: "MIGRATION_STATE" });
  assert.equal(connection.committed, false);
});

test("owner must have exactly one bootstrap audit event", async () => {
  const connection = new FakeConnection({ bootstrapCount: 0 });
  await assert.rejects(run(connection), { code: "BOOTSTRAP_AUDIT" });
  assert.equal(connection.committed, false);
});

test("wrong owner email, inactive owner, and duplicate owners refuse without writes", async () => {
  for (const connection of [
    new FakeConnection(),
    new FakeConnection({ owners: [{ id: 7, email: baseEnv.ADMIN_EMAIL, is_active: 0 }] }),
    new FakeConnection({ owners: [{ id: 7, email: baseEnv.ADMIN_EMAIL, is_active: 1 }, { id: 8, email: "other@example.test", is_active: 1 }] })
  ]) {
    const env = connection.state.owners[0].is_active === 1 && connection.state.owners.length === 1
      ? { ...baseEnv, ADMIN_EMAIL: "wrong@example.test" }
      : baseEnv;
    await assert.rejects(run(connection, env), { code: "OWNER_NOT_UNIQUE_ACTIVE_MATCH" });
    assert.equal(connection.state.owners[0].password_hash, "old-hash");
    assert.equal(connection.state.audits.length, 0);
    assert.equal(connection.committed, false);
  }
});

test("successful recovery uses the existing hasher, revokes sessions, audits, and preserves user count", async () => {
  const connection = new FakeConnection();
  const beforeUsers = connection.state.owners.length;
  await run(connection, baseEnv, hashPassword);
  assert.equal(connection.committed, true);
  assert.equal(connection.state.owners.length, beforeUsers);
  assert.match(connection.state.owners[0].password_hash, /^scrypt\$131072\$8\$1\$/);
  assert.equal(await verifyPassword(newPassword, connection.state.owners[0].password_hash), true);
  assert.equal(await verifyPassword("wrong-password", connection.state.owners[0].password_hash), false);
  assert.equal(connection.state.sessions.every((session) => session.revoked_at !== null), true);
  assert.equal(connection.state.audits.length, 1);
  assert.equal(connection.state.audits[0].action, "owner_password_recovery");
  assert.equal(JSON.stringify(connection.state.audits).includes(newPassword), false);
});

test("recovery is one-time for the same owner", async () => {
  const connection = new FakeConnection();
  await run(connection);
  await assert.rejects(run(connection), { code: "ALREADY_RECOVERED" });
  assert.equal(connection.state.audits.length, 1);
});

test("audit failure rolls back password and session changes without leaking secret", async () => {
  const connection = new FakeConnection({ failAudit: true });
  let error;
  try { await run(connection, baseEnv, async () => "fixture-hash"); } catch (caught) { error = caught; }
  assert.ok(error);
  assert.equal(String(error.message).includes(newPassword), false);
  assert.equal(String(error.message).includes("fixture-hash"), false);
  assert.equal(connection.state.owners[0].password_hash, "old-hash");
  assert.equal(connection.state.sessions.every((session) => session.revoked_at === null), true);
  assert.equal(connection.state.audits.length, 0);
  assert.equal(connection.committed, false);
});

test("CLI error formatter cannot leak secret-bearing underlying errors", () => {
  const error = new Error(`database failure with ${newPassword} and fixture-hash`);
  const output = recoveryFailureMessage(error);
  assert.equal(output.includes(newPassword), false);
  assert.equal(output.includes("fixture-hash"), false);
  assert.equal(output, "Owner recovery not completed (INTERNAL_ERROR).");
});
