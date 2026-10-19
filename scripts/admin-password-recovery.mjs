import { MIGRATION_VERSION } from "./admin-db-utils.mjs";
import { isApprovedProductionDatabase } from "./production-database-targets.mjs";

export class RecoveryRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = "RecoveryRefusal";
    this.code = code;
  }
}

export function recoveryFailureMessage(error) {
  const code = error instanceof RecoveryRefusal ? error.code : "INTERNAL_ERROR";
  return `Owner recovery not completed (${code}).`;
}

export function validateRecoveryEnvironment(env) {
  const targetDatabase = env.MYSQL_DATABASE?.trim();
  if (!isApprovedProductionDatabase(targetDatabase)) throw new RecoveryRefusal("DB_TARGET");
  if (env.CONFIRM_ADMIN_PASSWORD_RESET !== targetDatabase) throw new RecoveryRefusal("CONFIRMATION");

  const email = (env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
    throw new RecoveryRefusal("OWNER_EMAIL");
  }
  const password = env.ADMIN_RECOVERY_PASSWORD ?? "";
  if (password.length < 12 || password.length > 256) throw new RecoveryRefusal("NEW_PASSWORD");
  return { email, password, targetDatabase };
}

export async function recoverOwnerPassword({ env, openConnection, hashPassword }) {
  const { email, password, targetDatabase } = validateRecoveryEnvironment(env);
  const connection = await openConnection();
  let inTransaction = false;
  try {
    const [databaseRows] = await connection.query("SELECT DATABASE() AS database_name");
    if (databaseRows.length !== 1 || databaseRows[0].database_name !== targetDatabase) {
      throw new RecoveryRefusal("CONNECTED_DB_TARGET");
    }
    const [migrationRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM admin_schema_migrations WHERE version = ?",
      [MIGRATION_VERSION]
    );
    if (Number(migrationRows[0]?.count) !== 1) throw new RecoveryRefusal("MIGRATION_STATE");

    await connection.beginTransaction();
    inTransaction = true;
    // Lock every owner so simultaneous recovery commands cannot both pass the one-time guard.
    const [owners] = await connection.query(
      "SELECT id, email, is_active FROM admin_users WHERE role = 'owner' FOR UPDATE"
    );
    if (owners.length !== 1 || owners[0].is_active !== 1
      || String(owners[0].email).trim().toLowerCase() !== email) {
      throw new RecoveryRefusal("OWNER_NOT_UNIQUE_ACTIVE_MATCH");
    }
    const ownerId = owners[0].id;
    const [bootstrapAudit] = await connection.execute(
      "SELECT COUNT(*) AS count FROM admin_audit_logs WHERE actor_user_id = ? AND action = 'bootstrap_owner'",
      [ownerId]
    );
    if (Number(bootstrapAudit[0]?.count) !== 1) throw new RecoveryRefusal("BOOTSTRAP_AUDIT");
    const [priorRecovery] = await connection.execute(
      "SELECT COUNT(*) AS count FROM admin_audit_logs WHERE actor_user_id = ? AND action = 'owner_password_recovery'",
      [ownerId]
    );
    if (Number(priorRecovery[0]?.count) !== 0) throw new RecoveryRefusal("ALREADY_RECOVERED");

    const passwordHash = await hashPassword(password);
    const [updated] = await connection.execute(
      "UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ? AND role = 'owner' AND is_active = 1",
      [passwordHash, ownerId]
    );
    if (updated.affectedRows !== 1) throw new RecoveryRefusal("UPDATE_NOT_CONFIRMED");
    await connection.execute(
      "UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL",
      [ownerId]
    );
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_user_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, 'owner_password_recovery', 'admin_user', ?, ?)",
      [ownerId, email, String(ownerId), JSON.stringify({ method: "one_time_command" })]
    );
    await connection.commit();
    inTransaction = false;
  } catch (error) {
    if (inTransaction) await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    // A disconnect error after a successful commit must not make the outcome
    // appear uncommitted. The one-time audit guard handles ambiguous commits.
    await connection.end().catch(() => undefined);
  }
}
