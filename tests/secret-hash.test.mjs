import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { hashSessionToken, hashAuditValue } from "../src/lib/admin/secret-hash.ts";

const env = { NODE_ENV: "production", SESSION_SECRET: "fixture-session-secret-not-for-production", AUDIT_HASH_SECRET: "fixture-audit-secret-not-for-production" };

test("hash extraction preserves the existing HMAC algorithm and persisted format", () => {
  assert.equal(hashSessionToken("fixture-token", env), createHmac("sha256", env.SESSION_SECRET).update("fixture-token").digest("hex"));
  assert.equal(hashAuditValue("203.0.113.4", env), createHmac("sha256", env.AUDIT_HASH_SECRET).update("203.0.113.4").digest("hex"));
  assert.match(hashSessionToken("fixture-token", env), /^[a-f0-9]{64}$/);
});

test("session rotation invalidates old token lookups without changing audit pseudonyms", () => {
  const next = { ...env, SESSION_SECRET: "fixture-next-session-secret-not-for-production" };
  assert.notEqual(hashSessionToken("fixture-token", env), hashSessionToken("fixture-token", next));
  assert.equal(hashAuditValue("203.0.113.4", env), hashAuditValue("203.0.113.4", next));
});

test("audit rotation changes rate-limit keys/IP pseudonyms, not session hashes", () => {
  const next = { ...env, AUDIT_HASH_SECRET: "fixture-next-audit-secret-not-for-production" };
  assert.notEqual(hashAuditValue("203.0.113.4", env), hashAuditValue("203.0.113.4", next));
  assert.equal(hashSessionToken("fixture-token", env), hashSessionToken("fixture-token", next));
});

test("production never silently falls back to development secrets or the other secret", () => {
  for (const secret of [undefined, "short"]) {
    assert.throws(() => hashSessionToken("fixture-token", { ...env, SESSION_SECRET: secret }), /SESSION_SECRET must/);
    assert.throws(() => hashAuditValue("fixture-ip", { ...env, AUDIT_HASH_SECRET: secret }), /AUDIT_HASH_SECRET must/);
  }
});
