"use server";

import { revalidatePath } from "next/cache";
import type { ResultSetHeader } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { hashPassword } from "@/lib/admin/password";
import { requireAdminForMutation } from "@/lib/admin/session";
import { assertUserUpdateAllowed, lockAdminUsersForMutation, userIdValue } from "@/lib/admin/user-mutations";
import { AdminValidationError, emailValue, enumValue, friendlyDatabaseError } from "@/lib/admin/validation";

export type UserActionState = { error?: string; success?: string };

function passwordValue(value: FormDataEntryValue | null) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 12 || password.length > 256) throw new AdminValidationError("Mật khẩu phải có từ 12 đến 256 ký tự.");
  return password;
}

export async function createUserAction(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireAdminForMutation(["owner"]);
  let connection;
  try {
    const email = emailValue(formData.get("email"));
    const role = enumValue(formData.get("role"), "Vai trò", ["owner", "editor"] as const);
    const passwordHash = await hashPassword(passwordValue(formData.get("password")));
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    await lockAdminUsersForMutation(connection, actor.id);
    const [result] = await connection.execute<ResultSetHeader>(`INSERT INTO admin_users (email, password_hash, role, is_active, must_change_password) VALUES (?, ?, ?, 1, 0)`, [email, passwordHash, role]);
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "create", resourceType: "admin_user", resourceId: result.insertId, details: { email, role } }, connection);
    await connection.commit();
    revalidatePath("/admin/users");
    return { success: "Đã tạo tài khoản." };
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
}

export async function updateUserAction(id: number, _state: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireAdminForMutation(["owner"]);
  let connection;
  try {
    const targetId = userIdValue(id);
    const role = enumValue(formData.get("role"), "Vai trò", ["owner", "editor"] as const);
    const isActive = formData.get("is_active") === "1" ? 1 : 0;
    const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
    const passwordHash = password ? await hashPassword(passwordValue(password)) : null;
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    const users = await lockAdminUsersForMutation(connection, actor.id);
    const target = assertUserUpdateAllowed(users, actor.id, targetId, role, isActive);
    if (passwordHash) {
      await connection.execute(`UPDATE admin_users SET role=?, is_active=?, password_hash=?, must_change_password=0 WHERE id=?`, [role, isActive, passwordHash, targetId]);
      await connection.execute(`UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?`, [targetId]);
    } else {
      await connection.execute(`UPDATE admin_users SET role=?, is_active=? WHERE id=?`, [role, isActive, targetId]);
      if (!isActive || role !== target.role) await connection.execute(`UPDATE admin_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?`, [targetId]);
    }
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "update", resourceType: "admin_user", resourceId: targetId, details: { role, isActive, passwordReset: Boolean(password) } }, connection);
    await connection.commit();
    revalidatePath("/admin/users");
    return { success: "Đã cập nhật tài khoản." };
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
}
