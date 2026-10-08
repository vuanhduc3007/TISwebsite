import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { resolveTrustedClientIp, TrustedProxyError } from "../src/lib/admin/client-ip.ts";
import { consumeFixedWindow } from "../src/lib/admin/fixed-window.ts";

// Public fixture ONLY. Never use this value as a deployment credential.
const env = { NODE_ENV: "production", TRUSTED_PROXY_IP_HEADER: "x-real-ip", TRUSTED_PROXY_SECRET: "fixture-only-proxy-token-not-for-production" };
const headers = (ip = "203.0.113.4", token = env.TRUSTED_PROXY_SECRET) => new Headers({ "x-real-ip": ip, "x-tis-proxy-token": token });

test("production fails closed for missing/invalid proxy configuration", () => {
  for (const change of [{ TRUSTED_PROXY_SECRET: undefined }, { TRUSTED_PROXY_SECRET: "short" }, { TRUSTED_PROXY_IP_HEADER: undefined }, { TRUSTED_PROXY_IP_HEADER: "cookie" }]) {
    assert.throws(() => resolveTrustedClientIp(headers(), { ...env, ...change }), error => error instanceof TrustedProxyError && error.status === 503);
  }
});

test("direct requests and forged/duplicated proxy tokens cannot spoof the rate-limit IP", () => {
  for (const token of ["", "forged", env.TRUSTED_PROXY_SECRET + ", " + env.TRUSTED_PROXY_SECRET, "x".repeat(257)]) {
    assert.throws(() => resolveTrustedClientIp(headers("198.51.100.9", token), env), { status: 403 });
  }
  assert.throws(() => resolveTrustedClientIp(new Headers({ "x-forwarded-for": "198.51.100.9" }), env), { status: 403 });
});

test("only the authenticated proxy's configured single IP header is used", () => {
  const h = headers();
  h.set("x-forwarded-for", "198.51.100.9");
  h.set("cf-connecting-ip", "192.0.2.9");
  assert.equal(resolveTrustedClientIp(h, env), "203.0.113.4");
  assert.equal(resolveTrustedClientIp(new Headers({ "x-forwarded-for": "203.0.113.5", "x-tis-proxy-token": env.TRUSTED_PROXY_SECRET }), { ...env, TRUSTED_PROXY_IP_HEADER: "x-forwarded-for" }), "203.0.113.5");
});

test("missing/malformed IPs, forwarded chains, ports and zone IDs are rejected", () => {
  for (const ip of ["", "unknown", "203.0.113.4, 198.51.100.9", "203.0.113.4:443", "[2001:db8::1]", "fe80::1%eth0", "999.1.1.1", "01.2.3.4"]) {
    assert.throws(() => resolveTrustedClientIp(headers(ip), env), { status: 403 });
  }
});

test("IPv6 equivalence and IPv4-mapped IPv6 cannot split one IP into multiple quotas", () => {
  assert.equal(resolveTrustedClientIp(headers("2001:0DB8:0:0:0:0:0:1"), env), "2001:db8::1");
  assert.equal(resolveTrustedClientIp(headers("::ffff:203.0.113.4"), env), "203.0.113.4");
  assert.equal(resolveTrustedClientIp(headers("::ffff:cb00:7104"), env), "203.0.113.4");
});

test("development never trusts unauthenticated forwarded headers", () => {
  assert.equal(resolveTrustedClientIp(headers("203.0.113.4", "forged"), { NODE_ENV: "development" }), "development");
});

test("proxy refusal messages cannot disclose supplied or configured secrets", () => {
  try { resolveTrustedClientIp(headers("203.0.113.4", "sensitive-untrusted-token"), env); } catch (error) {
    assert.ok(!String(error).includes(env.TRUSTED_PROXY_SECRET));
    assert.ok(!String(error).includes("sensitive-untrusted-token"));
  }
});

function memoryStore() {
  const rows = new Map();
  const key = (scope, hash, date) => `${scope}:${hash}:${date.getTime()}`;
  return {
    rows,
    async increment(scope, hash, start) { const k = key(scope, hash, start); rows.set(k, (rows.get(k) ?? 0) + 1); },
    async count(scope, hash, start) { return rows.get(key(scope, hash, start)); },
    async prune() {}
  };
}

test("contact quota is per authenticated canonical IP; spoofed requests never touch the store", async () => {
  const storage = memoryStore();
  const hashIp = h => createHmac("sha256", "fixture-audit-pepper").update(resolveTrustedClientIp(h, env)).digest("hex");
  for (let i = 0; i < 5; i++) assert.equal((await consumeFixedWindow(storage, "contact", hashIp(headers()), 5, 900, 1000)).allowed, true);
  assert.equal((await consumeFixedWindow(storage, "contact", hashIp(headers("::ffff:203.0.113.4")), 5, 900, 1000)).allowed, false);
  assert.equal((await consumeFixedWindow(storage, "contact", hashIp(headers("203.0.113.5")), 5, 900, 1000)).allowed, true);
  const before = [...storage.rows];
  assert.throws(() => hashIp(headers("203.0.113.8", "forged")), { status: 403 });
  assert.deepEqual([...storage.rows], before);
  assert.ok(!JSON.stringify([...storage.rows]).includes("203.0.113"));
});

test("rate-limit window expiry, retry-after and scope separation are deterministic", async () => {
  const storage = memoryStore();
  assert.deepEqual(await consumeFixedWindow(storage, "login", "hash", 1, 900, 899000), { allowed: true, retryAfter: 1 });
  assert.equal((await consumeFixedWindow(storage, "login", "hash", 1, 900, 899000)).allowed, false);
  assert.equal((await consumeFixedWindow(storage, "contact", "hash", 1, 900, 899000)).allowed, true);
  assert.deepEqual(await consumeFixedWindow(storage, "login", "hash", 1, 900, 900000), { allowed: true, retryAfter: 900 });
});

test("counter failures fail closed; pruning failure cannot bypass quota", async () => {
  const storage = memoryStore();
  storage.prune = async () => { throw Error("fixture cleanup failure"); };
  assert.equal((await consumeFixedWindow(storage, "contact", "hash", 1, 900, 0)).allowed, true);
  assert.equal((await consumeFixedWindow(storage, "contact", "hash", 1, 900, 0)).allowed, false);
  storage.count = async () => undefined;
  assert.equal((await consumeFixedWindow(storage, "contact", "other", 1, 900, 0)).allowed, false);
  storage.increment = async () => { throw Error("fixture storage unavailable"); };
  await assert.rejects(consumeFixedWindow(storage, "contact", "hash", 1, 900, 0));
});
