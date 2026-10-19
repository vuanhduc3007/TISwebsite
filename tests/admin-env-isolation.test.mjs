import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { getDatabaseConfig, loadCloudinaryTestEnv } from "../scripts/admin-db-utils.mjs";

// Generated fixture files only. Never read the real project env or connect to DB/media.
const production = {
  MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "3306", MYSQL_USER: "fixture-production-user", MYSQL_PASSWORD: "fixture-production-db-password", MYSQL_SSL: "true",
  MYSQL_DATABASE: "solar_shop", MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-production",
  CLOUDINARY_CLOUD_NAME: "fixture-production", CLOUDINARY_API_KEY: "fixture-production-key", CLOUDINARY_API_SECRET: "fixture-production-secret"
};
const staging = {
  MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "3307", MYSQL_USER: "tiscms_test_fixture", MYSQL_PASSWORD: "fixture-test-db-password", MYSQL_SSL: "false",
  MYSQL_DATABASE: "solar_shop_admin_test", MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-e2e-test-fixture",
  CLOUDINARY_CLOUD_NAME: "fixture-staging", CLOUDINARY_API_KEY: "fixture-staging-key", CLOUDINARY_API_SECRET: "fixture-staging-secret"
};
const serviceKey = /^(?:MYSQL_|MEDIA_|CLOUDINARY_|SMTP_|CONTACT_|SESSION_|AUDIT_|TRUSTED_PROXY_)/;

function fixture(values, run, inherited = production) {
  const cwd = process.cwd();
  const originalEnv = { ...process.env };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tiscms-env-isolation-"));
  const files = [path.join(directory, ".env.local"), path.join(directory, ".env.cloudinary-test.local")];
  const serialize = env => Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n");
  try {
    fs.writeFileSync(files[0], serialize(production), { flag: "wx" });
    if (values !== null) fs.writeFileSync(files[1], serialize(values), { flag: "wx" });
    for (const key of Object.keys(process.env)) if (serviceKey.test(key)) delete process.env[key];
    Object.assign(process.env, inherited);
    process.chdir(directory);
    run();
  } finally {
    process.chdir(cwd);
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory);
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

test("TEST loader refuses production identity or credential reuse without disclosing values", () => {
  for (const key of ["MYSQL_PASSWORD", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    fixture({ ...staging, [key]: production[key] }, () => {
      assert.throws(loadCloudinaryTestEnv, error => {
        assert.match(error.message, /must not reuse production credentials/);
        for (const env of [production, staging]) for (const sensitive of ["MYSQL_PASSWORD", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) assert.ok(!error.message.includes(env[sensitive]));
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
    assert.equal(getDatabaseConfig().ssl, undefined);
  });
});

test("valid TEST configuration also works when the parent already has TEST values", () => {
  fixture(staging, () => {
    loadCloudinaryTestEnv();
    assert.equal(process.env.MYSQL_DATABASE, "solar_shop_admin_test");
  }, staging);
});

test("TEST loader rejects root, remote/default endpoints, and ambiguous TLS", () => {
  for (const override of [{ MYSQL_USER: "root" }, { MYSQL_HOST: "db.example.invalid" }, { MYSQL_HOST: "localhost" }, { MYSQL_PORT: "3306" }, { MYSQL_PORT: "3307x" }, { MYSQL_SSL: "yes" }, { MYSQL_SSL_CA: "fixture-ca" }]) {
    fixture({ ...staging, ...override }, () => assert.throws(loadCloudinaryTestEnv, /Refusing isolated operation/));
  }
});

test("TEST loader refuses inherited production credentials without a production database label", () => {
  fixture(staging, () => assert.throws(loadCloudinaryTestEnv, /must not reuse production credentials/), { CLOUDINARY_API_KEY: staging.CLOUDINARY_API_KEY });
});

test("TEST loader clears inherited service secrets and applies only file-owned TLS", () => {
  const inherited = { ...production, MYSQL_SSL_CA: "fixture-inherited-ca", MYSQL_SOCKET: "fixture-socket", CLOUDINARY_URL: "fixture-url", SMTP_PASS: "fixture-smtp", SESSION_SECRET: "fixture-session", TRUSTED_PROXY_SECRET: "fixture-proxy" };
  fixture(staging, () => {
    loadCloudinaryTestEnv();
    for (const key of ["MYSQL_SSL_CA", "MYSQL_SOCKET", "CLOUDINARY_URL", "SMTP_PASS", "SESSION_SECRET", "TRUSTED_PROXY_SECRET"]) assert.equal(process.env[key], undefined);
  }, inherited);
  fixture({ ...staging, MYSQL_SSL: "true", MYSQL_SSL_CA: "fixture-test-ca" }, () => {
    loadCloudinaryTestEnv();
    assert.deepEqual(getDatabaseConfig().ssl, { rejectUnauthorized: true, ca: "fixture-test-ca" });
  }, inherited);
});

test("TEST file cannot inject extra connection/provider overrides or service credentials", () => {
  for (const key of ["MYSQL_SOCKET", "CLOUDINARY_URL", "SMTP_PASS", "NODE_ENV"]) {
    fixture({ ...staging, [key]: "fixture-unsupported" }, () => assert.throws(loadCloudinaryTestEnv, /unsupported variable/));
  }
});
