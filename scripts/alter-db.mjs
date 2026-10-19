import mysql from "mysql2/promise";
import { getDisposableMaintenanceConfig, isDirectInvocation, reportMaintenanceFailure } from "./disposable-maintenance.mjs";

export async function alterDatabase({ env = process.env, args = process.argv.slice(2), connect = mysql.createConnection } = {}) {
  const config = getDisposableMaintenanceConfig("alter", { env, args });
  const connection = await connect(config);
  try {
    await connection.query("ALTER TABLE products ADD COLUMN specifications JSON NULL;");
    console.log("Disposable database specifications column added.");
  } catch (error) {
    if (error?.code === "ER_DUP_FIELDNAME") console.log("Disposable database specifications column already exists.");
    else throw error;
  } finally {
    await connection.end();
  }
}

if (isDirectInvocation(import.meta.url)) alterDatabase().catch(reportMaintenanceFailure);
