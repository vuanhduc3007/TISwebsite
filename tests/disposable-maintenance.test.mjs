import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { getDisposableMaintenanceConfig, prepareDisposableSchema } from "../scripts/disposable-maintenance.mjs";
import { initDatabase } from "../scripts/init-db.mjs";
import { alterDatabase } from "../scripts/alter-db.mjs";
import { enrichProducts } from "../scripts/enrich-products.mjs";

const fixtureEnv = {
  NODE_ENV: "test", MAINTENANCE_MODE: "disposable", MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "3307",
  MYSQL_USER: "tiscms_disposable_fixture", MYSQL_PASSWORD: "fixture-only-password", MYSQL_DATABASE: "solar_shop_disposable_fixture", MYSQL_SSL: "false"
};
const args = operation => [`--confirm=${operation}:${fixtureEnv.MYSQL_DATABASE}`];
const operations = [["init", initDatabase], ["alter", alterDatabase], ["enrich", enrichProducts]];

// Only dependency-injected fakes below. No env file is loaded, and no socket is opened.
test("all legacy maintenance entry points refuse unsafe targets before reading or connecting", async () => {
  for (const [operation, run] of operations) {
    let connections = 0;
    let schemaReads = 0;
    for (const override of [{ NODE_ENV: "production" }, { MAINTENANCE_MODE: "" }, { MYSQL_HOST: "db.example.invalid" }, { MYSQL_PORT: "3306" }, { MYSQL_USER: "root" }, { MYSQL_DATABASE: "solar_shop" }, { MYSQL_PASSWORD: "" }, { MYSQL_SSL: "" }]) {
      await assert.rejects(run({ env: { ...fixtureEnv, ...override }, args: args(operation), connect: async () => { connections++; throw Error("Unexpected connection"); }, readSchema: () => { schemaReads++; return ""; } }), /Refusing/);
    }
    for (const confirmation of [[], args("another-operation"), [...args(operation), "--force"], [`--confirm=${operation}:solar_shop`]]) {
      await assert.rejects(run({ env: fixtureEnv, args: confirmation, connect: async () => { connections++; throw Error("Unexpected connection"); } }), /Refusing/);
    }
    assert.equal(connections, 0);
    assert.equal(schemaReads, 0);
  }
});

test("maintenance requires each database variable explicitly and never defaults to root", () => {
  for (const key of ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "MYSQL_SSL"]) {
    const env = { ...fixtureEnv };
    delete env[key];
    assert.throws(() => getDisposableMaintenanceConfig("init", { env, args: args("init") }), /must be configured explicitly/);
  }
});

test("legacy seed is bound to connection.database; schema selector drift fails before connect", async () => {
  const schema = fs.readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8");
  const scoped = prepareDisposableSchema(schema);
  assert.doesNotMatch(scoped, /^\s*(?:CREATE DATABASE|USE )/im);
  let observed;
  let ended = false;
  await initDatabase({ env: fixtureEnv, args: args("init"), readSchema: () => schema, connect: async config => {
    observed = config;
    return { query: async sql => { assert.equal(sql, scoped); }, end: async () => { ended = true; } };
  } });
  assert.equal(observed.database, fixtureEnv.MYSQL_DATABASE);
  assert.equal(observed.user, fixtureEnv.MYSQL_USER);
  assert.equal(observed.multipleStatements, true);
  assert.equal(ended, true);
  let connections = 0;
  for (const changed of [schema.replace("USE solar_shop;", "USE production;"), `${schema}\nUSE solar_shop;`, `${schema}\nDROP DATABASE another;`, `${schema}\nSELECT * FROM solar_shop.products;`]) {
    await assert.rejects(initDatabase({ env: fixtureEnv, args: args("init"), readSchema: () => changed, connect: async () => { connections++; throw Error("Unexpected connection"); } }), /Refusing legacy seed/);
  }
  assert.equal(connections, 0);
});

test("enrichment uses one transaction, rolls back failed writes and leaves the seed file untouched", async () => {
  const schemaUrl = new URL("../sql/schema.sql", import.meta.url);
  const originalSchema = fs.readFileSync(schemaUrl, "utf8");
  const events = [];
  const connection = {
    beginTransaction: async () => events.push("begin"),
    query: async sql => { assert.match(sql, /FOR UPDATE$/); return [[{ id: 1, category_id: 1, name: "Fixture", brand: "Fixture", price: "100", image_url: null }]]; },
    execute: async () => { events.push("write"); throw Error("Fixture write failure"); },
    commit: async () => events.push("commit"),
    rollback: async () => events.push("rollback"),
    end: async () => events.push("end")
  };
  await assert.rejects(enrichProducts({ env: fixtureEnv, args: args("enrich"), connect: async () => connection }), /Fixture write failure/);
  assert.deepEqual(events, ["begin", "write", "rollback", "end"]);
  assert.equal(fs.readFileSync(schemaUrl, "utf8"), originalSchema);
});

test("alter handles the known duplicate-column case and propagates other failures", async () => {
  let ended = 0;
  await alterDatabase({ env: fixtureEnv, args: args("alter"), connect: async () => ({ query: async () => { throw Object.assign(Error("fixture"), { code: "ER_DUP_FIELDNAME" }); }, end: async () => { ended++; } }) });
  await assert.rejects(alterDatabase({ env: fixtureEnv, args: args("alter"), connect: async () => ({ query: async () => { throw Error("fixture failure"); }, end: async () => { ended++; } }) }), /fixture failure/);
  assert.equal(ended, 2);
});
