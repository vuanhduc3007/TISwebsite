import "server-only";

import mysql, { type Pool } from "mysql2/promise";

export class DatabaseConfigurationError extends Error {
  constructor(message = "MySQL environment variables are not configured.") {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

let pool: Pool | undefined;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new DatabaseConfigurationError(`Missing ${name}.`);
  }
  return value;
}

export function getDatabasePool() {
  if (pool) {
    return pool;
  }

  const host = getRequiredEnv("MYSQL_HOST");
  const user = getRequiredEnv("MYSQL_USER");
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = getRequiredEnv("MYSQL_DATABASE");
  const parsedPort = Number(process.env.MYSQL_PORT ?? "3306");
  const useTls = process.env.MYSQL_SSL === "true";
  const sslCa = process.env.MYSQL_SSL_CA?.replaceAll("\\n", "\n").trim();

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new DatabaseConfigurationError("MYSQL_PORT must be a valid TCP port.");
  }

  pool = mysql.createPool({
    host,
    port: parsedPort,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    // DATE has no time or timezone. Preserve it for Project forms/display;
    // DATETIME/TIMESTAMP keep their existing decoding (sessions/audit/etc.).
    dateStrings: ["DATE"],
    ...(useTls ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } } : {})
  });

  return pool;
}
