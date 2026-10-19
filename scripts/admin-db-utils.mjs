import fs from "node:fs";
import path from "node:path";
import { getIsolatedDatabaseConfig } from "./disposable-maintenance.mjs";

export const MIGRATION_VERSION = "001_admin_cms";

function readEnvValues(fileName) {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return null;
  const values = [];
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values.push([match[1], value]);
  }
  return values;
}

export function loadEnvFile(fileName, { override = false } = {}) {
  const values = readEnvValues(fileName);
  if (!values) return false;
  for (const [key, value] of values) {
    if (override || !process.env[key]) process.env[key] = value;
  }
  return true;
}

export function loadEnvLocal() {
  loadEnvFile(".env.local");
}

export function loadCloudinaryTestEnv() {
  // Read .env.local only for credential-reuse comparisons, never import it. The
  // test snapshot must be complete before any DB/provider caller can proceed.
  const values = readEnvValues(".env.cloudinary-test.local");
  if (!values) throw new Error("Cloudinary test environment file is missing.");
  const testEnv = Object.fromEntries(values);
  for (const key of ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "MYSQL_SSL", "MEDIA_PROVIDER", "MEDIA_STORAGE_PREFIX", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    if (!testEnv[key]?.trim()) throw new Error(`Refusing test: ${key} must be configured explicitly in the test file.`);
  }
  getIsolatedDatabaseConfig(testEnv, { database: /^solar_shop_admin_test$/, userPattern: /^tiscms_test(?:_[a-z0-9_]{1,20})?$/ });
  if (testEnv.MEDIA_PROVIDER !== "cloudinary"
    || !/^tiscms-e2e-test(?:[a-z0-9/_-]*)$/.test(testEnv.MEDIA_STORAGE_PREFIX)
    || testEnv.MEDIA_STORAGE_PREFIX.includes("..")) {
    throw new Error("Refusing test: Cloudinary provider or test namespace is invalid.");
  }
  if (testEnv.CLOUDINARY_API_KEY === testEnv.CLOUDINARY_API_SECRET) {
    throw new Error("Refusing test: Cloudinary API key and secret must differ.");
  }
  if (!/^[a-z0-9_-]+$/.test(testEnv.CLOUDINARY_CLOUD_NAME)) throw new Error("Refusing test: Cloudinary cloud name is invalid.");
  const localEnv = Object.fromEntries(readEnvValues(".env.local") ?? []);
  const inheritedIsSameTest = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "MYSQL_SSL", "MEDIA_PROVIDER", "MEDIA_STORAGE_PREFIX", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .every(key => process.env[key] === testEnv[key]);
  const productionSources = [localEnv, ...(inheritedIsSameTest ? [] : [process.env])];
  for (const production of productionSources) {
    for (const key of ["MYSQL_USER", "MYSQL_PASSWORD", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
      if (production[key]?.trim() && production[key].trim() === testEnv[key].trim()) {
        throw new Error(`Refusing test: ${key} must not reuse production credentials or identity.`);
      }
    }
    if (production.MYSQL_HOST === testEnv.MYSQL_HOST && Number(production.MYSQL_PORT || 3306) === Number(testEnv.MYSQL_PORT)) {
      throw new Error("Refusing test: database endpoint must be isolated from the configured production endpoint.");
    }
  }
  const allowedKeys = new Set(["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "MYSQL_SSL", "MYSQL_SSL_CA", "MEDIA_PROVIDER", "MEDIA_STORAGE_PREFIX", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
  for (const [key] of values) if (!allowedKeys.has(key)) throw new Error(`Refusing test: unsupported variable ${key} in the test file.`);
  // Do not retain inherited CA/socket/provider/SMTP/auth configuration, including
  // keys that the current implementation does not use but a future SDK might.
  for (const key of Object.keys(process.env)) {
    if (/^(?:MYSQL_|MEDIA_|CLOUDINARY_|SMTP_|CONTACT_|SESSION_|AUDIT_|TRUSTED_PROXY_)/.test(key)) delete process.env[key];
  }
  for (const [key, value] of values) process.env[key] = value;
}

export function getDatabaseConfig(options = {}) {
  const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"];
  for (const key of required) if (!process.env[key]?.trim()) throw new Error(`Missing ${key}.`);
  const port = Number(process.env.MYSQL_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("MYSQL_PORT is invalid.");
  const useTls = process.env.MYSQL_SSL === "true";
  const sslCa = process.env.MYSQL_SSL_CA?.replaceAll("\\n", "\n").trim();
  return {
    host: process.env.MYSQL_HOST.trim(),
    port,
    user: process.env.MYSQL_USER.trim(),
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE.trim(),
    ...(useTls ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } } : {}),
    ...options
  };
}

const baselineColumns = {
  categories: ["id", "name", "created_at"],
  products: ["id", "category_id", "name", "price", "image_url", "brand", "created_at", "specifications"],
  projects: ["id", "name", "client", "pillar", "location", "contract_value_vnd", "contract_date", "date_display", "is_highlight", "sort_order", "status", "created_at", "updated_at"],
  project_images: ["id", "project_id", "image_url", "caption", "sort_order"]
};

const addedColumns = {
  categories: ["slug", "sort_order", "is_active", "updated_at"],
  products: ["slug", "status", "sort_order", "description", "image_alt", "image_storage_key", "price_amount", "price_label", "updated_at", "deleted_at"],
  projects: ["deleted_at"],
  project_images: ["alt_text", "storage_key", "mime_type", "file_size", "width", "height"]
};

const adminTables = ["admin_users", "admin_sessions", "admin_audit_logs", "rate_limits"];
const addedIndexes = ["uq_categories_slug", "idx_categories_admin", "uq_products_slug", "idx_products_public", "idx_products_admin", "idx_projects_admin"];
const addedConstraints = ["fk_admin_sessions_user", "fk_admin_audit_actor"];

export async function preflightAdminMigration(connection) {
  const [serverRows] = await connection.query(`SELECT VERSION() AS version, DATABASE() AS database_name`);
  const server = serverRows[0];
  if (!String(server.version).startsWith("8.")) throw new Error(`MySQL 8.x is required; found ${server.version}.`);

  const [historyTables] = await connection.query(`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_schema_migrations'`);
  if (Number(historyTables[0].count) === 1) {
    const [versions] = await connection.execute(`SELECT version FROM admin_schema_migrations WHERE version=? LIMIT 1`, [MIGRATION_VERSION]);
    if (versions[0]) return { status: "applied", server };
  }

  const [tables] = await connection.query(`SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`);
  const tableMap = new Map(tables.map((row) => [row.TABLE_NAME, row]));
  const issues = [];
  for (const table of Object.keys(baselineColumns)) {
    if (!tableMap.has(table)) issues.push(`Missing baseline table: ${table}`);
    else if (tableMap.get(table).ENGINE !== "InnoDB") issues.push(`${table} must use InnoDB.`);
  }
  for (const table of adminTables) if (tableMap.has(table)) issues.push(`Admin table already exists without migration history: ${table}`);
  if (tableMap.has("admin_schema_migrations")) issues.push("Migration history table exists but 001_admin_cms is not recorded.");

  const [columns] = await connection.query(`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()`);
  const columnSet = new Set(columns.map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  for (const [table, names] of Object.entries(baselineColumns)) {
    for (const name of names) if (!columnSet.has(`${table}.${name}`)) issues.push(`Missing baseline column: ${table}.${name}`);
  }
  for (const [table, names] of Object.entries(addedColumns)) {
    for (const name of names) if (columnSet.has(`${table}.${name}`)) issues.push(`Admin column already exists without migration history: ${table}.${name}`);
  }
  const [indexes] = await connection.query(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()`);
  const indexNames = new Set(indexes.map((row) => row.INDEX_NAME));
  for (const name of addedIndexes) if (indexNames.has(name)) issues.push(`Migration index name already exists: ${name}`);
  const [constraints] = await connection.query(`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()`);
  const constraintNames = new Set(constraints.map((row) => row.CONSTRAINT_NAME));
  for (const name of addedConstraints) if (constraintNames.has(name)) issues.push(`Migration constraint name already exists: ${name}`);

  const [checks] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.category_id IS NOT NULL AND c.id IS NULL) AS orphan_products,
      (SELECT COUNT(*) FROM project_images pi LEFT JOIN projects p ON p.id=pi.project_id WHERE p.id IS NULL) AS orphan_project_images,
      (SELECT COUNT(*) FROM products WHERE price REGEXP '^[0-9]+$' AND (CHAR_LENGTH(TRIM(LEADING '0' FROM price)) > 20 OR (CHAR_LENGTH(TRIM(LEADING '0' FROM price)) = 20 AND TRIM(LEADING '0' FROM price) > '18446744073709551615'))) AS overflowing_prices,
      (SELECT COALESCE(MAX(id), 0) FROM products) AS max_product_id,
      (SELECT COALESCE(MAX(id), 0) FROM categories) AS max_category_id,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM project_images) AS project_images
  `);
  const data = checks[0];
  if (Number(data.orphan_products) > 0) issues.push(`Found ${data.orphan_products} products with missing categories.`);
  if (Number(data.orphan_project_images) > 0) issues.push(`Found ${data.orphan_project_images} project images with missing projects.`);
  if (Number(data.overflowing_prices) > 0) issues.push(`Found ${data.overflowing_prices} numeric prices that exceed BIGINT UNSIGNED.`);
  if (Number(data.max_product_id) > 214_748_364) issues.push("Product IDs are too large for the id * 10 sort-order backfill.");
  if (Number(data.max_category_id) > 214_748_364) issues.push("Category IDs are too large for the id * 10 sort-order backfill.");
  if (issues.length) throw new Error(`Admin migration preflight failed:\n- ${issues.join("\n- ")}`);
  return { status: "ready", server, counts: { categories: Number(data.categories), products: Number(data.products), projects: Number(data.projects), projectImages: Number(data.project_images) } };
}
