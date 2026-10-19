import assert from "node:assert/strict";
import { test } from "node:test";
import { getDatabaseConnectionOptions } from "../src/lib/db.ts";
import { getSmtpConfiguration } from "../src/lib/smtp-config.ts";

const database = {
  NODE_ENV: "production", MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "3306",
  MYSQL_USER: "fixture_app", MYSQL_PASSWORD: "fixture-only-password",
  MYSQL_DATABASE: "fixture_db", MYSQL_SSL: "false"
};

test("production database rejects root and missing credentials before creating a pool", () => {
  for (const change of [
    { MYSQL_USER: "root" }, { MYSQL_USER: "ROOT" }, { MYSQL_PASSWORD: "" },
    { MYSQL_PORT: "0" }, { MYSQL_SSL: "invalid" }
  ]) {
    assert.throws(() => getDatabaseConnectionOptions({ ...database, ...change }), error =>
      error.name === "DatabaseConfigurationError" && !error.message.includes(database.MYSQL_PASSWORD));
  }
  assert.equal(getDatabaseConnectionOptions(database).user, "fixture_app");
});

test("remote production database requires verified TLS", () => {
  const remote = { ...database, MYSQL_HOST: "db.example.test" };
  assert.throws(() => getDatabaseConnectionOptions(remote), /requires verified TLS or an approved private-network target/);
  const options = getDatabaseConnectionOptions({ ...remote, MYSQL_SSL: "true" });
  assert.equal(options.ssl.rejectUnauthorized, true);
});

test("Vibe Host plaintext is allowed only for its exact private service target and explicit opt-in", () => {
  const privateTarget = { ...database, MYSQL_HOST: "vays-db-190f951b-mysql-3306" };
  assert.throws(() => getDatabaseConnectionOptions(privateTarget), /approved private-network target/);
  assert.equal(getDatabaseConnectionOptions({ ...privateTarget, MYSQL_TRUSTED_PRIVATE_NETWORK: "true" }).host, privateTarget.MYSQL_HOST);
  for (const host of ["db.example.test", "vays-db-190f951b-mysql-3306.example.test", "vays-db-../../mysql-3306"]) {
    assert.throws(() => getDatabaseConnectionOptions({ ...privateTarget, MYSQL_HOST: host, MYSQL_TRUSTED_PRIVATE_NETWORK: "true" }));
  }
  assert.throws(() => getDatabaseConnectionOptions({ ...privateTarget, MYSQL_TRUSTED_PRIVATE_NETWORK: "yes" }));
  assert.throws(() => getDatabaseConnectionOptions({ ...privateTarget, MYSQL_SSL_CA: "fixture-ca" }), /requires MYSQL_SSL=true/);
});

test("production SMTP requires a configured sender and recipient", () => {
  const smtp = {
    NODE_ENV: "production", SMTP_HOST: "smtp.example.test", SMTP_PORT: "587",
    SMTP_USER: "fixture@example.test", SMTP_PASS: "fixture-only-password"
  };
  assert.throws(() => getSmtpConfiguration(smtp), /incomplete or invalid/);
  assert.throws(() => getSmtpConfiguration({ ...smtp, SMTP_FROM: "sender@example.test" }), /incomplete or invalid/);
  const config = getSmtpConfiguration({ ...smtp, SMTP_FROM: "sender@example.test", CONTACT_EMAIL: "contact@example.test" });
  assert.equal(config.to, "contact@example.test");
  assert.equal(config.transport.tls.rejectUnauthorized, true);
});
