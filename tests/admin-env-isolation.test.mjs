import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadCloudinaryTestEnv } from "../scripts/admin-db-utils.mjs";

// Generated fixture files only. Never read the real project env or connect to DB/media.
const production = {
  MYSQL_DATABASE: "solar_shop", MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-production",
  CLOUDINARY_CLOUD_NAME: "fixture-production", CLOUDINARY_API_KEY: "fixture-production-key", CLOUDINARY_API_SECRET: "fixture-production-secret"
};
const staging = {
  MYSQL_DATABASE: "solar_shop_admin_test", MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-e2e-test-fixture",
  CLOUDINARY_CLOUD_NAME: "fixture-staging", CLOUDINARY_API_KEY: "fixture-staging-key", CLOUDINARY_API_SECRET: "fixture-staging-secret"
};

function fixture(values, run, inherited = production) {
  const cwd = process.cwd();
  const originalEnv = { ...process.env };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tiscms-env-isolation-"));
  const files = [path.join(directory, ".env.local"), path.join(directory, ".env.cloudinary-test.local")];
  const serialize = env => Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n");
  try {
    fs.writeFileSync(files[0], serialize(production), { flag: "wx" });
    if (values !== null) fs.writeFileSync(files[1], serialize(values), { flag: "wx" });
    Object.assign(process.env, inherited);
    process.chdir(directory);
    run();
  } finally {
    process.chdir(cwd);
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory); // No recursive delete; only this freshly created fixture directory.
  }
}

test("TEST loader refuses absent test file even when production credentials exist", () => {
  fixture(null, () => assert.throws(loadCloudinaryTestEnv, /test environment file is missing/));
});

test("every safety-critical TEST variable must be file-owned, never inherited", () => {
  for (const key of Object.keys(staging)) {
    const values = { ...staging };
    delete values[key];
    fixture(values, () => {
      assert.throws(loadCloudinaryTestEnv, /must be configured explicitly/);
      assert.equal(process.env.MYSQL_DATABASE, "solar_shop");
    });
  }
});

test("TEST loader refuses production DB and production namespace", () => {
  fixture({ ...staging, MYSQL_DATABASE: "solar_shop" }, () => assert.throws(loadCloudinaryTestEnv, /MYSQL_DATABASE must/));
  fixture({ ...staging, MEDIA_STORAGE_PREFIX: "tiscms-production" }, () => assert.throws(loadCloudinaryTestEnv, /test namespace is invalid/));
});

test("TEST loader refuses production key or secret reuse without disclosing credentials", () => {
  for (const key of ["CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    fixture({ ...staging, [key]: production[key] }, () => {
      assert.throws(loadCloudinaryTestEnv, error => {
        assert.match(error.message, /must not reuse production credentials/);
        for (const env of [production, staging]) for (const sensitive of ["CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) assert.ok(!error.message.includes(env[sensitive]));
        return true;
      });
    });
  }
});

test("TEST loader refuses identical API key and secret", () => {
  fixture({ ...staging, CLOUDINARY_API_SECRET: staging.CLOUDINARY_API_KEY }, () => assert.throws(loadCloudinaryTestEnv, /key and secret must differ/));
});

test("valid isolated TEST configuration overrides inherited production values", () => {
  fixture(staging, () => {
    loadCloudinaryTestEnv();
    for (const key of Object.keys(staging)) assert.ok(process.env[key] === staging[key]);
  });
});

test("valid TEST configuration also works when the parent already has TEST values", () => {
  fixture(staging, () => {
    loadCloudinaryTestEnv();
    assert.equal(process.env.MYSQL_DATABASE, "solar_shop_admin_test");
  }, staging);
});
