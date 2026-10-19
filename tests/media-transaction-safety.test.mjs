import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

// Source-level action integration: no Next server, mysql driver, credentials,
// provider SDK, filesystem uploads or network. Every runtime import is mocked.
function loadSource(relative, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, FormData, File, Buffer,
    console: { error() {} },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw Error(`Unmocked import blocked: ${name}`);
    }
  }, { filename: relative });
  return module.exports;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function form(kind, upload = true, images = []) {
  const data = new FormData();
  const values = kind === "product"
    ? { name: "Fixture", slug: "fixture", category_id: "1", brand: "Fixture", status: "draft", sort_order: "0" }
    : { name: "Fixture", client: "Fixture", pillar: "it", status: "draft", sort_order: "0", existing_images: JSON.stringify(images) };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  if (upload) data.append(kind === "product" ? "image" : "images", new File(["fixture"], "fixture.png"));
  return data;
}

function fixture(options = {}) {
  const state = {
    product: { slug: "fixture", image_url: "https://fixture.invalid/old", image_storage_key: "old" },
    project: { id: 1 }, images: [{ id: 1, storage_key: "old", sort_order: 0 }],
    assets: new Set(["old"]), deleted: [], connections: [], uploads: 0,
    commits: 0, referenceChecks: 0, rollbackCalls: 0, nextImageId: 2,
    ...options.state
  };
  // The fixture lock represents InnoDB's parent-row X lock. Snapshot data is
  // taken only after obtaining it; no real database or TCP connection is used.
  let lockTail = Promise.resolve();
  const pool = {
    async getConnection() {
      const number = state.connections.length;
      let releaseLock;
      let snapshot;
      let locked = false;
      async function lock() {
        if (locked) return;
        locked = true;
        const prior = lockTail;
        const gate = deferred();
        lockTail = gate.promise;
        releaseLock = gate.resolve;
        await prior;
        snapshot = structuredClone({ product: state.product, project: state.project, images: state.images });
        if (options.afterLock) await options.afterLock(number);
      }
      function unlock() { releaseLock?.(); releaseLock = undefined; }
      const connection = {
        destroyed: false, released: false,
        async beginTransaction() {},
        async execute(sql, values = []) {
          const query = sql.trim().replace(/\s+/g, " ");
          if (/FOR UPDATE|^(INSERT|UPDATE|DELETE)/.test(query)) await lock();
          if (options.failQuery?.(query, number)) throw Object.assign(Error("Fixture query failure"), { code: options.queryErrorCode ?? "ER_LOCK_DEADLOCK" });
          if (query.startsWith("SELECT slug")) return [state.product ? [{ ...state.product }] : []];
          if (query.startsWith("SELECT image_storage_key")) return [state.product ? [{ image_storage_key: state.product.image_storage_key }] : []];
          if (query.startsWith("SELECT id FROM projects")) return [state.project ? [{ id: 1 }] : []];
          if (query.startsWith("SELECT id, storage_key, sort_order")) return [state.images.map(image => ({ ...image }))];
          if (query.startsWith("SELECT storage_key FROM project_images")) return [state.images.map(image => ({ storage_key: image.storage_key }))];
          if (query.startsWith("INSERT INTO products")) state.product = { slug: values[0], image_url: values[6], image_storage_key: values[8] };
          else if (query.startsWith("UPDATE products SET slug")) state.product = { slug: values[0], image_url: values[6], image_storage_key: values[8] };
          else if (query.startsWith("DELETE FROM products")) state.product = null;
          else if (query.startsWith("INSERT INTO projects")) state.project = { id: 1 };
          else if (query.startsWith("DELETE FROM projects")) { state.project = null; state.images = []; }
          else if (query.startsWith("INSERT INTO project_images")) state.images.push({ id: state.nextImageId++, storage_key: values[2], sort_order: values[7] });
          else if (query.startsWith("DELETE FROM project_images")) {
            if (options.zeroImageEffect) return [{ affectedRows: 0 }];
            const before = state.images.length;
            state.images = state.images.filter(image => image.id !== values[0]);
            return [{ affectedRows: before - state.images.length }];
          } else if (query.startsWith("UPDATE project_images")) {
            const image = state.images.find(image => image.id === values[3]);
            if (!image || options.zeroImageEffect) return [{ affectedRows: 0 }];
            image.sort_order = values[2];
          } else if (!query.startsWith("UPDATE projects SET")) throw Error(`Unexpected query: ${query}`);
          return [{ affectedRows: 1, insertId: 1 }];
        },
        async commit() {
          state.commits++;
          unlock();
          if (options.commitLoss) throw Error("Fixture lost COMMIT acknowledgement");
        },
        async rollback() {
          state.rollbackCalls++;
          if (options.rollbackLoss) throw Error("Fixture rollback timeout");
          if (snapshot) Object.assign(state, structuredClone(snapshot));
          unlock();
        },
        destroy() { this.destroyed = true; unlock(); },
        release() { this.released = true; unlock(); }
      };
      state.connections.push(connection);
      return connection;
    },
    async execute(sql, values) {
      state.referenceChecks++;
      assert.match(sql, /FROM products[\s\S]*FROM project_images/);
      if (options.referenceFailure) throw Error("Fixture DB unavailable");
      const referenced = state.product?.image_storage_key === values[0] || state.images.some(image => image.storage_key === values[0]);
      return [referenced ? [{ referenced: 1 }] : []];
    }
  };
  const media = {
    async storeImage() {
      state.uploads++;
      if (options.failUploadAt === state.uploads) throw Error("Fixture upload timeout");
      const key = `new-${state.uploads}`;
      state.assets.add(key);
      return { url: `https://fixture.invalid/${key}`, storageKey: key, mimeType: "image/png", fileSize: 7, width: 1, height: 1 };
    },
    async deleteStoredImage(key) {
      if (options.deleteFailure) throw Error("Fixture provider timeout");
      state.deleted.push(key);
      state.assets.delete(key);
    }
  };
  const helper = loadSource("src/lib/admin/media-transaction.ts", { "server-only": {}, "@/lib/db": { getDatabasePool: () => pool }, "@/lib/admin/media": media });
  const validation = loadSource("src/lib/admin/validation.ts", {});
  const mocks = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect(url) { throw Object.assign(Error("Fixture redirect"), { redirect: url }); } },
    "@/lib/db": { getDatabasePool: () => pool },
    "@/lib/admin/audit": { async writeAuditLog() {} },
    "@/lib/admin/media": media,
    "@/lib/admin/media-transaction": helper,
    "@/lib/admin/session": { async requireAdminForMutation() { return { id: 7, email: "owner@example.test", role: "owner" }; } },
    "@/lib/admin/validation": validation
  };
  return { state, helper, product: loadSource("src/app/(admin)/admin/actions/products.ts", mocks), project: loadSource("src/app/(admin)/admin/actions/projects.ts", mocks) };
}

async function redirected(action) {
  await assert.rejects(action, error => typeof error.redirect === "string");
}

for (const kind of ["product", "project"]) {
  const title = kind[0].toUpperCase() + kind.slice(1);
  for (const operation of ["create", "update"]) {
    test(`${kind} ${operation}: lost COMMIT acknowledgement preserves media and refuses blind retry`, async () => {
      const f = fixture({ commitLoss: true });
      const args = operation === "create" ? [{}, form(kind)] : [1, {}, form(kind, true, [{ id: 1, remove: true }])];
      const result = await f[kind][`${operation}${title}Action`](...args);
      assert.equal(result.errorCode, "SAVE_OUTCOME_UNKNOWN");
      assert.equal(f.state.commits, 1);
      assert.equal(f.state.uploads, 1);
      assert.equal(f.state.rollbackCalls, 0, "ROLLBACK must not be interpreted as undoing an uncertain COMMIT");
      assert.deepEqual(f.state.deleted, []);
      assert.ok(f.state.assets.has("new-1"));
      assert.ok(f.state.connections[0].destroyed);
      assert.ok(!f.state.connections[0].released);
    });
  }
  test(`${kind} hard delete: lost COMMIT acknowledgement does not delete media`, async () => {
    const f = fixture({ commitLoss: true });
    await assert.rejects(f[kind][`hardDelete${title}Action`](1), error => error.message === f.helper.MEDIA_OUTCOME_UNKNOWN.error);
    assert.deepEqual(f.state.deleted, []);
    assert.ok(f.state.connections[0].destroyed);
  });
  for (const code of ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]) {
    test(`${kind}: ${code} with acknowledged rollback cleans only new uploads`, async () => {
      const f = fixture({ failQuery: query => query.startsWith("INSERT"), queryErrorCode: code });
      const result = await f[kind][`create${title}Action`]({}, form(kind));
      assert.ok(result.error);
      assert.equal(result.errorCode, undefined);
      assert.deepEqual(f.state.deleted, ["new-1"]);
      assert.ok(f.state.assets.has("old"));
      assert.equal(f.state.commits, 0);
      assert.equal(f.state.uploads, 1, "No automatic transaction retry");
    });
  }
  test(`${kind}: failed rollback preserves uploads and destroys the connection`, async () => {
    const f = fixture({ failQuery: query => query.startsWith("INSERT"), rollbackLoss: true });
    const result = await f[kind][`create${title}Action`]({}, form(kind));
    assert.equal(result.errorCode, "SAVE_OUTCOME_UNKNOWN");
    assert.deepEqual(f.state.deleted, []);
    assert.ok(f.state.connections[0].destroyed);
    assert.ok(!f.state.connections[0].released);
  });
}

test("concurrent product metadata save reads the newly committed image instead of restoring the deleted key", async () => {
  const firstLocked = deferred();
  const continueFirst = deferred();
  const f = fixture({ state: { images: [] }, afterLock: async number => {
    if (number === 0) { firstLocked.resolve(); await continueFirst.promise; }
  } });
  const first = redirected(f.product.updateProductAction(1, {}, form("product")));
  await firstLocked.promise;
  const second = redirected(f.product.updateProductAction(1, {}, form("product", false)));
  continueFirst.resolve();
  await Promise.all([first, second]);
  assert.equal(f.state.product.image_storage_key, "new-1");
  assert.ok(f.state.assets.has(f.state.product.image_storage_key));
  assert.deepEqual(f.state.deleted, ["old"]);
});

test("concurrent image replacements retain the final referenced asset", async () => {
  const firstLocked = deferred();
  const continueFirst = deferred();
  const f = fixture({ state: { images: [] }, afterLock: async number => {
    if (number === 0) { firstLocked.resolve(); await continueFirst.promise; }
  } });
  const first = redirected(f.product.updateProductAction(1, {}, form("product")));
  await firstLocked.promise;
  const second = redirected(f.product.updateProductAction(1, {}, form("product")));
  continueFirst.resolve();
  await Promise.all([first, second]);
  assert.equal(f.state.product.image_storage_key, "new-2");
  assert.ok(f.state.assets.has("new-2"));
  assert.ok(!f.state.deleted.includes("new-2"));
  assert.deepEqual(new Set(f.state.deleted), new Set(["old", "new-1"]));
});

test("stale project removal is rejected using current locked image membership", async () => {
  const f = fixture({ state: { images: [] } });
  const result = await f.project.updateProjectAction(1, {}, form("project", true, [{ id: 1, remove: true }]));
  assert.ok(result.error);
  assert.equal(f.state.commits, 0);
  assert.deepEqual(f.state.deleted, ["new-1"]);
});

test("project save retains omitted concurrent images and appends uploads after their sort order", async () => {
  const f = fixture({ state: { images: [{ id: 2, storage_key: "concurrent", sort_order: 8 }] } });
  await redirected(f.project.updateProjectAction(1, {}, form("project")));
  assert.equal(f.state.images[0].storage_key, "concurrent");
  assert.equal(f.state.images[1].sort_order, 9);
});

test("zero-effect project image delete does not schedule remote deletion", async () => {
  const f = fixture({ zeroImageEffect: true });
  const result = await f.project.updateProjectAction(1, {}, form("project", false, [{ id: 1, remove: true }]));
  assert.ok(result.error);
  assert.equal(f.state.commits, 0);
  assert.deepEqual(f.state.deleted, []);
});

test("partial upload failure cleans completed uploads before acquiring a DB connection", async () => {
  const f = fixture({ failUploadAt: 2 });
  const data = form("project");
  data.append("images", new File(["fixture"], "second.png"));
  const result = await f.project.createProjectAction({}, data);
  assert.ok(result.error);
  assert.deepEqual(f.state.deleted, ["new-1"]);
  assert.equal(f.state.connections.length, 0);
});

test("detached cleanup preserves a key still referenced by the other resource table", async () => {
  const f = fixture();
  await redirected(f.product.updateProductAction(1, {}, form("product")));
  assert.ok(f.state.referenceChecks > 0);
  assert.deepEqual(f.state.deleted, []);
  assert.ok(f.state.assets.has("old"));
});

for (const failure of ["referenceFailure", "deleteFailure"]) {
  test(`${failure} after acknowledged commit keeps the saved result successful`, async () => {
    const f = fixture({ [failure]: true, state: { images: [] } });
    await redirected(f.product.updateProductAction(1, {}, form("product")));
    assert.equal(f.state.commits, 1);
    assert.equal(f.state.product.image_storage_key, "new-1");
    assert.ok(f.state.assets.has("old"), "Failure should leave an orphan for reconciliation");
    assert.ok(f.state.assets.has("new-1"));
    assert.ok(f.state.connections[0].released);
  });
}

test("detached cleanup deduplicates keys and never deletes without a successful DB check", async () => {
  const f = fixture({ state: { product: null, images: [] } });
  await f.helper.cleanupDetachedMedia(["old", "old", null]);
  assert.equal(f.state.referenceChecks, 1);
  assert.deepEqual(f.state.deleted, ["old"]);
});
