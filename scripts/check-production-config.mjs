import { loadEnvLocal } from "./admin-db-utils.mjs";
import { validateTrustedProxyConfiguration } from "../src/lib/admin/client-ip.ts";
import { getSmtpConfiguration } from "../src/lib/smtp-config.ts";
import { getDatabaseConnectionOptions } from "../src/lib/db.ts";

// Offline only: NO database, SMTP or Cloudinary connection, and no writes.
loadEnvLocal();
const env = process.env;
function valid(fn) { try { fn(); return true; } catch { return false; } }
const loopback = ["localhost", "127.0.0.1", "::1"].includes(env.MYSQL_HOST?.trim());
const port = Number(env.MYSQL_PORT ?? 3306);
const checks = {
  databaseTarget: env.MYSQL_DATABASE === "solar_shop",
  mysqlConnectionVariables: ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD"].every(key => Boolean(env[key]?.trim())),
  mysqlPort: Number.isInteger(port) && port >= 1 && port <= 65535,
  mysqlNonRootUser: Boolean(env.MYSQL_USER?.trim()) && env.MYSQL_USER.trim().toLowerCase() !== "root",
  mysqlRemoteTls: loopback || env.MYSQL_SSL === "true",
  mysqlRuntimeGuard: valid(() => getDatabaseConnectionOptions({ ...env, NODE_ENV: "production" })),
  sessionSecret: (env.SESSION_SECRET?.trim().length ?? 0) >= 32,
  auditSecret: (env.AUDIT_HASH_SECRET?.trim().length ?? 0) >= 32,
  secretsDistinct: Boolean(env.SESSION_SECRET && env.AUDIT_HASH_SECRET) && env.SESSION_SECRET.trim() !== env.AUDIT_HASH_SECRET.trim(),
  trustedProxy: valid(() => validateTrustedProxyConfiguration(env)),
  mediaProvider: env.MEDIA_PROVIDER === "cloudinary",
  mediaNamespace: env.MEDIA_STORAGE_PREFIX === "tiscms-production",
  cloudinaryVariables: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(key => Boolean(env[key]?.trim())),
  cloudinaryKeySecretDistinct: Boolean(env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) && env.CLOUDINARY_API_KEY !== env.CLOUDINARY_API_SECRET,
  smtpConfiguration: valid(() => getSmtpConfiguration({ ...env, NODE_ENV: "production" })),
  hstsConfigured: env.ENABLE_HSTS === "true",
  temporaryCredentialsRemoved: ["ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_RECOVERY_PASSWORD", "CONFIRM_ADMIN_PASSWORD_RESET", "CONFIRM_ADMIN_CREATE", "CONFIRM_ADMIN_MIGRATION", "SMOKE_ADMIN_EMAIL", "SMOKE_ADMIN_PASSWORD"].every(key => !env[key])
};
const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
console.log(JSON.stringify({ scope: "configuration-only; not an infrastructure/security certification", checks, failed, result: failed.length ? "BLOCKED" : "CONFIGURATION_PASS", databaseWrites: false, secretValuesPrinted: false }, null, 2));
if (failed.length) process.exitCode = 1;
