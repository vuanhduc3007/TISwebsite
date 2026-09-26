import mysql from "mysql2/promise";
import { getDatabaseConfig, loadCloudinaryTestEnv, MIGRATION_VERSION } from "./admin-db-utils.mjs";

loadCloudinaryTestEnv();
const config = getDatabaseConfig();
if (config.database !== "solar_shop_admin_test") throw new Error("Refusing test database connection.");

const connection = await mysql.createConnection(config);
try {
  const [databaseRows] = await connection.query("SELECT DATABASE() AS database_name");
  if (databaseRows[0]?.database_name !== "solar_shop_admin_test") throw new Error("Connected to an unexpected database.");
  const [migrationRows] = await connection.execute(
    "SELECT version FROM admin_schema_migrations WHERE version=? LIMIT 1",
    [MIGRATION_VERSION]
  );
  if (!migrationRows[0]) throw new Error("The test database has not completed admin migration.");
  const [cleanupRows] = await connection.execute(`SELECT
    (SELECT COUNT(*) FROM projects WHERE name IN ('__cloudinary_e2e_batch__', '__cloudinary_e2e_delete__')) AS project_fixtures,
    (SELECT COUNT(*) FROM project_images WHERE storage_key LIKE ?) AS project_image_references,
    (SELECT COUNT(*) FROM products WHERE image_storage_key LIKE ?) AS product_image_references`,
  [`${process.env.MEDIA_STORAGE_PREFIX}/%`, `${process.env.MEDIA_STORAGE_PREFIX}/%`]);
  console.log(JSON.stringify({
    provider: process.env.MEDIA_PROVIDER,
    prefix: process.env.MEDIA_STORAGE_PREFIX,
    cloudNamePresent: true,
    apiKeyPresent: true,
    apiSecretPresent: true,
    database: databaseRows[0].database_name,
    migration: MIGRATION_VERSION,
    projectFixtures: Number(cleanupRows[0].project_fixtures),
    projectImageReferences: Number(cleanupRows[0].project_image_references),
    productImageReferences: Number(cleanupRows[0].product_image_references),
    status: "ready"
  }, null, 2));
} finally {
  await connection.end();
}
