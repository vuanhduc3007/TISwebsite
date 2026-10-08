import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

test("production security headers and private Admin/contact caching are configured", async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, ENABLE_HSTS: process.env.ENABLE_HSTS };
  process.env.NODE_ENV = "production";
  process.env.ENABLE_HSTS = "true";
  try {
    const { default: config } = await import("../next.config.ts?headers-test");
    const rules = await config.headers();
    const all = new Map(rules.find(rule => rule.source === "/:path*").headers.map(header => [header.key, header.value]));
    assert.equal(all.get("X-Frame-Options"), "DENY");
    assert.equal(all.get("X-Content-Type-Options"), "nosniff");
    assert.ok(all.get("Content-Security-Policy").includes("object-src 'none'"));
    assert.ok(!all.get("Content-Security-Policy").includes("unsafe-eval"));
    assert.equal(all.get("Strict-Transport-Security"), "max-age=31536000; includeSubDomains");
    for (const source of ["/admin/:path*", "/api/contact"]) assert.ok(rules.find(rule => rule.source === source).headers.find(header => header.key === "Cache-Control").value.includes("no-store"));
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("HSTS stays opt-in until HTTPS is verified", async () => {
  const previous = process.env.ENABLE_HSTS;
  process.env.ENABLE_HSTS = "false";
  try {
    const { default: config } = await import("../next.config.ts?hsts-disabled-test");
    const rules = await config.headers();
    assert.ok(!rules.some(rule => rule.headers.some(header => header.key === "Strict-Transport-Security")));
  } finally { if (previous === undefined) delete process.env.ENABLE_HSTS; else process.env.ENABLE_HSTS = previous; }
});

test("CSP allows the actual Maps iframe origin only, without weakening frame ancestors", async () => {
  const { default: config } = await import("../next.config.ts?maps-frame-test");
  const rules = await config.headers();
  const csp = rules.find(rule => rule.source === "/:path*").headers.find(header => header.key === "Content-Security-Policy").value;
  const directives = new Map(csp.split(";").map(part => {
    const [name, ...sources] = part.trim().split(/\s+/);
    return [name, sources];
  }));
  const footer = fs.readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
  const src = /<iframe[\s\S]*?src="([^"]+)"/.exec(footer)?.[1];
  assert.ok(src, "Maps iframe source missing");
  assert.deepEqual(directives.get("frame-src"), [new URL(src).origin]);
  assert.deepEqual(directives.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.ok(!directives.get("frame-src").some(value => value.includes("*") || value === "https:"));
});
