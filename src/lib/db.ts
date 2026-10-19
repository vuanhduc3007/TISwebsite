import "server-only";

import mysql, { type Pool } from "mysql2/promise";

export class DatabaseConfigurationError extends Error {
  constructor(message = "MySQL environment variables are not configured.") {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

let pool: Pool | undefined;

function getRequiredEnv(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) {
    throw new DatabaseConfigurationError(`Missing ${name}.`);
  }
  return value;
}

// Validate before constructing a pool: bypassing the deployment checker must
// not allow the production application to connect with root or cleartext remote DB.
export function getDatabaseConnectionOptions(env: NodeJS.ProcessEnv) {
  const host = getRequiredEnv(env, "MYSQL_HOST");
  const user = getRequiredEnv(env, "MYSQL_USER");
  const password = env.MYSQL_PASSWORD ?? "";
  const database = getRequiredEnv(env, "MYSQL_DATABASE");
  const parsedPort = Number(env.MYSQL_PORT ?? "3306");
  const useTls = env.MYSQL_SSL === "true";
  const sslCa = env.MYSQL_SSL_CA?.replaceAll("\\n", "\n").trim();

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new DatabaseConfigurationError("MYSQL_PORT must be a valid TCP port.");
  }
  if (env.MYSQL_SSL !== undefined && !["true", "false"].includes(env.MYSQL_SSL)) {
    throw new DatabaseConfigurationError("MYSQL_SSL must be true or false.");
  }
  if (/[\s/\\@\0]/.test(host) || [user, database].some(value => /[\0\r\n]/.test(value))) {
    throw new DatabaseConfigurationError("MySQL connection configuration is invalid.");
  }
  if (env.NODE_ENV === "production") {
    if (user.toLowerCase() === "root" || !password.trim()) {
      throw new DatabaseConfigurationError("Production requires a non-root database user and password.");
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(host.toLowerCase()) && !useTls) {
      throw new DatabaseConfigurationError("Production remote MySQL requires verified TLS.");
    }
  }

  return {
    host,
    port: parsedPort,
    user,
    password,
    database,
    ...(useTls ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } } : {})
  };
}

export function getDatabasePool() {
  if (pool) return pool;
  const connection = getDatabaseConnectionOptions(process.env);
  pool = mysql.createPool({
    ...connection,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    // DATE has no time or timezone. Preserve it for Project forms/display;
    // DATETIME/TIMESTAMP keep their existing decoding (sessions/audit/etc.).
    dateStrings: ["DATE"]
  });

  return pool;
}
