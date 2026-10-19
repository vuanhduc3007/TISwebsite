import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredDatabaseKeys = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "MYSQL_SSL"];

// Pure validation: no env-file loading, connections, DNS, provider calls or logging.
export function getIsolatedDatabaseConfig(env, { database, userPattern }) {
  for (const key of requiredDatabaseKeys) {
    if (typeof env[key] !== "string" || !env[key].trim()) {
      throw new Error(`Refusing isolated operation: ${key} must be configured explicitly.`);
    }
  }
  if (!["127.0.0.1", "::1"].includes(env.MYSQL_HOST)) {
    throw new Error("Refusing isolated operation: MYSQL_HOST must be a literal loopback address.");
  }
  if (!/^[0-9]+$/.test(env.MYSQL_PORT)) throw new Error("Refusing isolated operation: MYSQL_PORT is invalid.");
  const port = Number(env.MYSQL_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || port === 3306) {
    throw new Error("Refusing isolated operation: MYSQL_PORT must be a dedicated non-default port.");
  }
  if (!database.test(env.MYSQL_DATABASE)) throw new Error("Refusing isolated operation: MYSQL_DATABASE must identify the approved disposable database.");
  if (!userPattern.test(env.MYSQL_USER)) throw new Error("Refusing isolated operation: MYSQL_USER must be a dedicated non-root test identity.");
  if (!["true", "false"].includes(env.MYSQL_SSL)) throw new Error("Refusing isolated operation: MYSQL_SSL must be explicitly true or false.");
  if (env.MYSQL_SSL === "false" && env.MYSQL_SSL_CA?.trim()) throw new Error("Refusing isolated operation: MYSQL_SSL_CA requires verified TLS.");
  const sslCa = env.MYSQL_SSL_CA?.replaceAll("\\n", "\n").trim();
  return {
    host: env.MYSQL_HOST,
    port,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    ...(env.MYSQL_SSL === "true" ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } } : {})
  };
}

export function getDisposableMaintenanceConfig(operation, { env = process.env, args = process.argv.slice(2) } = {}) {
  if (!["init", "alter", "enrich"].includes(operation)) throw new Error("Unsupported maintenance operation.");
  if (env.NODE_ENV === "production" || env.MAINTENANCE_MODE !== "disposable") {
    throw new Error("Refusing legacy maintenance: explicit MAINTENANCE_MODE=disposable is required outside production.");
  }
  const config = getIsolatedDatabaseConfig(env, {
    database: /^solar_shop_disposable_[a-z0-9_]{1,32}$/,
    userPattern: /^tiscms_disposable_[a-z0-9_]{1,14}$/
  });
  const confirmation = `--confirm=${operation}:${config.database}`;
  if (args.length !== 1 || args[0] !== confirmation) {
    throw new Error("Refusing legacy maintenance: an exact operation/database --confirm argument is required.");
  }
  return config;
}

export function prepareDisposableSchema(sql) {
  // The legacy seed's CREATE/USE directives ignore connection.database. Remove only
  // the exact known header; schema drift must fail before a connection is opened.
  const create = /^CREATE DATABASE IF NOT EXISTS solar_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\r?$/gm;
  const use = /^USE solar_shop;\r?$/gm;
  if ([...sql.matchAll(create)].length !== 1 || [...sql.matchAll(use)].length !== 1) {
    throw new Error("Refusing legacy seed: database header is unexpected.");
  }
  const scoped = sql.replace(create, "-- Database must already exist: use the validated connection target.").replace(use, "");
  if (/^\s*(?:(?:CREATE|ALTER|DROP)\s+DATABASE\b|USE\s+)/im.test(scoped) || /\bsolar_shop\s*\./i.test(scoped)) {
    throw new Error("Refusing legacy seed: an unexpected database selector remains.");
  }
  return scoped;
}

export function isDirectInvocation(moduleUrl) {
  return Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === moduleUrl;
}

export function reportMaintenanceFailure() {
  // mysql/provider errors may contain statements, connection details or secrets.
  console.error("Maintenance refused or failed. No credential details are printed; inspect the disposable environment and documented guards.");
  process.exitCode = 1;
}
