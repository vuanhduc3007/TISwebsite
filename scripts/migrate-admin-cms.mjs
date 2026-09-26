import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { getDatabaseConfig, loadEnvLocal, preflightAdminMigration } from "./admin-db-utils.mjs";

loadEnvLocal();
const config = getDatabaseConfig({ multipleStatements: true });
if (process.env.CONFIRM_ADMIN_MIGRATION !== config.database) {
  throw new Error("Refusing migration: CONFIRM_ADMIN_MIGRATION must exactly equal MYSQL_DATABASE.");
}

const connection = await mysql.createConnection(config);

try {
  const preflight = await preflightAdminMigration(connection);
  if (preflight.status === "applied") {
    console.log("Admin CMS migration was already applied; no statements executed.");
    process.exitCode = 0;
  } else {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "sql", "migrations", "001_admin_cms.sql"), "utf8");
  await connection.query(sql);
  console.log("Admin CMS migration completed.");
  }
} finally {
  await connection.end();
}
