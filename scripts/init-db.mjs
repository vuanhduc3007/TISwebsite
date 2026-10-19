import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { getDisposableMaintenanceConfig, isDirectInvocation, prepareDisposableSchema, reportMaintenanceFailure } from "./disposable-maintenance.mjs";

export async function initDatabase({ env = process.env, args = process.argv.slice(2), connect = mysql.createConnection, readSchema = () => fs.readFileSync(path.resolve(process.cwd(), "sql", "schema.sql"), "utf8") } = {}) {
  const config = getDisposableMaintenanceConfig("init", { env, args });
  const sql = prepareDisposableSchema(readSchema());
  const connection = await connect({ ...config, multipleStatements: true });
  try {
    await connection.query(sql);
    console.log("Disposable database initialized. This seed is not a production recovery artifact.");
  } finally {
    await connection.end();
  }
}

if (isDirectInvocation(import.meta.url)) initDatabase().catch(reportMaintenanceFailure);
