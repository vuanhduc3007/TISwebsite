import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import mysql from "mysql2/promise";
import { getDatabaseConfig, loadEnvLocal, MIGRATION_VERSION } from "./admin-db-utils.mjs";

async function hashPassword(password) {
  const scrypt = promisify(scryptCallback);
  const salt = randomBytes(16);
  const N = 131072, r = 8, p = 1;
  const key = await scrypt(password, salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

loadEnvLocal();
const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL is invalid.");
if (password.length < 12 || password.length > 256) throw new Error("ADMIN_PASSWORD must contain 12-256 characters.");
const config = getDatabaseConfig();
if (process.env.CONFIRM_ADMIN_CREATE !== config.database) {
  throw new Error("Refusing owner creation: CONFIRM_ADMIN_CREATE must exactly equal MYSQL_DATABASE.");
}

const connection = await mysql.createConnection(config);
try {
  const [migrationRows] = await connection.execute(`SELECT version FROM admin_schema_migrations WHERE version=? LIMIT 1`, [MIGRATION_VERSION]);
  if (!migrationRows[0]) throw new Error("Admin CMS migration has not been completed.");
  const [userRows] = await connection.query(`SELECT COUNT(*) AS count FROM admin_users`);
  if (Number(userRows[0].count) > 0) throw new Error("Admin users already exist. Create additional users from the owner UI.");
  const passwordHash = await hashPassword(password);
  await connection.beginTransaction();
  const [result] = await connection.execute(`INSERT INTO admin_users (email, password_hash, role, is_active, must_change_password) VALUES (?, ?, 'owner', 1, 0)`, [email, passwordHash]);
  await connection.execute(`INSERT INTO admin_audit_logs (actor_user_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, 'bootstrap_owner', 'admin_user', ?, ?)`, [result.insertId, email, String(result.insertId), JSON.stringify({ role: "owner" })]);
  await connection.commit();
  console.log(`Owner account created for ${email}. Remove ADMIN_EMAIL and ADMIN_PASSWORD from the environment now.`);
} catch (error) {
  await connection.rollback().catch(() => undefined);
  throw error;
} finally {
  await connection.end();
}
