import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

// Runs only against a NEW loopback server with throwaway credentials. Does NOT
// load .env.local. A TCP sentinel guards against ANY database connection attempt.
let databaseAttempts = 0;
const sentinel = createServer(socket => { databaseAttempts++; socket.destroy(); });
await new Promise(resolve => sentinel.listen(0, "127.0.0.1", resolve));
const databasePort = sentinel.address().port;
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
const appPort = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const proxyToken = randomBytes(32).toString("hex");
const fixtureEnv = {
  ...process.env,
  NODE_ENV: "production",
  MYSQL_HOST: "127.0.0.1", MYSQL_PORT: String(databasePort), MYSQL_DATABASE: "hardening_smoke_no_database",
  MYSQL_USER: "fixture_no_db_user", MYSQL_PASSWORD: randomBytes(32).toString("hex"), MYSQL_SSL: "false",
  SESSION_SECRET: randomBytes(32).toString("hex"), AUDIT_HASH_SECRET: randomBytes(32).toString("hex"),
  TRUSTED_PROXY_IP_HEADER: "x-real-ip", TRUSTED_PROXY_SECRET: proxyToken,
  ENABLE_HSTS: "true",
  MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-e2e-test-hardening-no-upload",
  CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "",
  SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", CONTACT_EMAIL: "",
  SMOKE_ADMIN_EMAIL: "", SMOKE_ADMIN_PASSWORD: "", ADMIN_EMAIL: "", ADMIN_PASSWORD: "", ADMIN_RECOVERY_PASSWORD: "",
  CONFIRM_ADMIN_CREATE: "", CONFIRM_ADMIN_MIGRATION: "", CONFIRM_ADMIN_PASSWORD_RESET: ""
};
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(appPort)], { env: fixtureEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });
let exited = false;
const stopped = new Promise(resolve => server.once("exit", () => { exited = true; resolve(); }));
const base = `http://127.0.0.1:${appPort}`;
const checks = {};
let stage = "server startup";
const builtHeaders = JSON.parse(fs.readFileSync(path.resolve(".next/routes-manifest.json"), "utf8")).headers;
const builtHsts = builtHeaders.find(rule => rule.source === "/:path*")?.headers.find(header => header.key.toLowerCase() === "strict-transport-security")?.value ?? null;
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
function actionForm(html) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]).find(value => value.includes('name="email"'));
  assert.ok(form, "Login action form missing");
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attributes = Object.fromEntries([...match[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(item => [item[1], decode(item[2])]));
    if (attributes.name?.startsWith("$ACTION_")) data.set(attributes.name, attributes.value ?? "");
  }
  assert.ok([...data.keys()].some(key => key.startsWith("$ACTION_")), "Action fields missing");
  data.set("email", "fixture@example.test");
  data.set("password", "short"); // Invalid BEFORE rate-limit/password/DB processing.
  return data;
}
async function contact(headers) {
  return fetch(base + "/api/contact", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: "{}", redirect: "manual", signal: AbortSignal.timeout(10000) });
}
try {
  let ready = false;
  for (let i = 0; i < 100 && !exited; i++) {
    try { ready = (await fetch(base + "/", { signal: AbortSignal.timeout(1000) })).status === 200; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, "Isolated server did not start");
  for (const route of ["/", "/contact", "/admin/login"]) {
    stage = "security headers: " + route;
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.ok(response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
    assert.ok(response.headers.get("content-security-policy")?.includes("frame-src https://maps.google.com"));
    // HSTS is a BUILD-TIME setting. Runtime env alone cannot enable it.
    assert.equal(response.headers.get("strict-transport-security"), builtHsts);
    if (route.startsWith("/admin")) assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  }
  checks.publicStaticAndSecurityHeaders = true;
  stage = "anonymous Admin redirect";
  const anonymous = await fetch(base + "/admin", { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  assert.ok(anonymous.headers.get("location")?.endsWith("/admin/login"));
  checks.anonymousAdminRedirect = true;
  for (const headers of [{ "x-real-ip": "203.0.113.4" }, { "x-real-ip": "203.0.113.4", "x-tis-proxy-token": "forged" }, { "x-real-ip": "203.0.113.4, 198.51.100.8", "x-tis-proxy-token": proxyToken }]) {
    stage = "contact proxy rejection";
    const response = await contact(headers);
    assert.equal(response.status, 403);
    assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  }
  checks.contactRejectsDirectSpoofedAndChainedRequests = true;
  const loginHtml = await (await fetch(base + "/admin/login")).text();
  for (const trusted of [false, true]) {
    stage = trusted ? "login: valid proxy, invalid input" : "login: direct bypass rejection";
    const response = await fetch(base + "/admin/login", { method: "POST", headers: { Origin: base, "x-real-ip": "203.0.113.4", ...(trusted ? { "x-tis-proxy-token": proxyToken } : {}) }, body: actionForm(loginHtml), redirect: "manual", signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, trusted ? 200 : 403);
    assert.ok(!response.headers.get("set-cookie")?.includes("tis_admin_session"));
    const html = await response.text();
    assert.ok(trusted ? html.includes("Email hoặc mật khẩu không đúng.") : html.includes("Request gateway verification failed."));
    assert.ok(!html.includes(proxyToken));
  }
  checks.loginProxyGuardAndValidProxyInvalidInput = true;
  stage = "DB connection and log safety";
  assert.equal(databaseAttempts, 0, "Smoke unexpectedly attempted a DB connection");
  checks.noDatabaseConnections = true;
  for (const key of ["TRUSTED_PROXY_SECRET", "MYSQL_PASSWORD", "SESSION_SECRET", "AUDIT_HASH_SECRET"]) assert.ok(!logs.includes(fixtureEnv[key]), "Secret found in server log");
  checks.noFixtureSecretsInServerLogs = true;
  console.log(JSON.stringify({ result: "PASS", checks, productionDbUsed: false, smtpOrCloudinaryRequests: false }));
} catch (error) {
  // Never dump server logs/environment/request bodies on failure.
  console.log(JSON.stringify({ result: "FAIL", failedStage: stage, completedChecks: checks, error: error instanceof assert.AssertionError ? "Smoke assertion failed; raw details withheld" : "Isolated smoke failed", databaseAttempts }));
  process.exitCode = 1;
} finally {
  if (!exited) server.kill();
  await Promise.race([stopped, delay(5000)]);
  if (!exited) { console.log(JSON.stringify({ serverStopped: false })); process.exitCode = 1; }
  else console.log(JSON.stringify({ serverStopped: true }));
  await new Promise(resolve => sentinel.close(resolve));
}
