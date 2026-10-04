import mysql from "mysql2/promise";
import { hashPassword } from "../src/lib/admin/password.ts";
import { getDatabaseConfig, loadEnvLocal } from "./admin-db-utils.mjs";
import { recoverOwnerPassword, recoveryFailureMessage, validateRecoveryEnvironment } from "./admin-password-recovery.mjs";

// This command intentionally accepts no CLI arguments, particularly no password.
if (process.argv.length !== 2) {
  console.error("Owner recovery refused (CLI_ARGUMENTS). Do not pass credentials on the command line.");
  process.exitCode = 1;
} else {
  loadEnvLocal();
  try {
    validateRecoveryEnvironment(process.env);
    const config = getDatabaseConfig();
    await recoverOwnerPassword({
      env: process.env,
      openConnection: () => mysql.createConnection(config),
      hashPassword
    });
    console.log("Owner password recovery completed. Remove temporary recovery environment variables now.");
  } catch (error) {
    // Never print a database error, password, hash, or connection configuration.
    console.error(recoveryFailureMessage(error));
    process.exitCode = 1;
  }
}
