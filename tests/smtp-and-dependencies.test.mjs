import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import nodemailer from "nodemailer";
import sharp from "sharp";
import { getSmtpConfiguration } from "../src/lib/smtp-config.ts";

const require = createRequire(import.meta.url);
const env = { SMTP_HOST: "smtp.example.test", SMTP_USER: "owner@example.test", SMTP_PASS: "fixture-only-smtp-password", SMTP_PORT: "587", SMTP_SECURE: "false", CONTACT_EMAIL: "contact@example.test" };

test("missing SMTP credentials are rejected without leaking secrets", () => {
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) {
    assert.throws(() => getSmtpConfiguration({ ...env, [key]: "" }), error => error.message === "SMTP configuration is incomplete or invalid." && !error.message.includes(env.SMTP_PASS));
  }
});

test("SMTP 587 requires verified STARTTLS; 465 uses verified implicit TLS", () => {
  const a = getSmtpConfiguration(env);
  assert.equal(a.transport.requireTLS, true);
  assert.equal(a.transport.secure, false);
  assert.equal(a.transport.tls.rejectUnauthorized, true);
  assert.equal(a.transport.tls.minVersion, "TLSv1.2");
  assert.equal(a.transport.socketTimeout, 60000);
  const b = getSmtpConfiguration({ ...env, SMTP_PORT: "465" });
  assert.equal(b.transport.secure, true);
  assert.equal(b.transport.requireTLS, false);
});

test("SMTP sender/reply-to defaults are controlled by configuration, not a hard-coded domain", () => {
  const a = getSmtpConfiguration(env);
  assert.equal(a.from, env.SMTP_USER);
  assert.equal(a.replyTo, a.from);
  assert.equal(a.to, env.CONTACT_EMAIL);
  const b = getSmtpConfiguration({ ...env, SMTP_USER: "provider-auth-user", SMTP_FROM: "sender@example.test", SMTP_REPLY_TO: "support@example.test" });
  assert.equal(b.from, "sender@example.test");
  assert.equal(b.replyTo, "support@example.test");
});

test("malformed SMTP configuration/header injection is rejected", () => {
  for (const change of [{ SMTP_PORT: "NaN" }, { SMTP_PORT: "0" }, { SMTP_SECURE: "invalid" }, { SMTP_FROM: "a@example.test\r\nBcc: leak@example.test" }, { CONTACT_EMAIL: "not-an-email" }, { SMTP_REPLY_TO: "bad\n@example.test" }, { SMTP_HOST: "smtp://example.test" }]) {
    assert.throws(() => getSmtpConfiguration({ ...env, ...change }));
  }
});

test("Nodemailer 10 builds a message using an in-memory transport, with NO SMTP connection", async () => {
  assert.equal(require("nodemailer/package.json").version, "10.0.16");
  const smtp = getSmtpConfiguration(env);
  const transporter = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const result = await transporter.sendMail({ from: { name: "TIS Website", address: smtp.from }, to: smtp.to, replyTo: smtp.replyTo, subject: "[TIS Website] fixture", text: "Fixture only", html: "<p>Fixture only</p>" });
  const message = result.message.toString();
  assert.ok(message.includes("Reply-To: owner@example.test"));
  assert.ok(!message.includes(env.SMTP_PASS));
});

test("patched sharp binary can process PNG without a network request", async () => {
  assert.equal(sharp.versions.sharp, "0.35.5");
  const result = await sharp(fs.readFileSync(new URL("../public/brand/tis-logo.png", import.meta.url))).resize(16, 16).png().toBuffer();
  assert.ok(result.length > 0);
});

test("patched source-map-js can consume a normal source map", () => {
  assert.equal(require("source-map-js/package.json").version, "1.2.2");
  const { SourceMapConsumer, SourceMapGenerator } = require("source-map-js");
  const map = new SourceMapGenerator({ file: "fixture.js" });
  map.addMapping({ generated: { line: 1, column: 0 }, original: { line: 1, column: 0 }, source: "fixture.ts" });
  const consumer = new SourceMapConsumer(map.toJSON());
  assert.equal(consumer.originalPositionFor({ line: 1, column: 0 }).source, "fixture.ts");
});
