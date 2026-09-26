import mysql from "mysql2/promise";
import { getDatabaseConfig, loadEnvLocal, preflightAdminMigration } from "./admin-db-utils.mjs";

loadEnvLocal();
const connection = await mysql.createConnection(getDatabaseConfig());
try {
  const result = await preflightAdminMigration(connection);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await connection.end();
}
