"use server";

import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/admin/password";
import { consumeRateLimit } from "@/lib/admin/rate-limit";
import { getRequestIp, hashSensitiveValue } from "@/lib/admin/request";
import { createAdminSessionRecord, revokeCurrentSession, setAdminSessionCookie } from "@/lib/admin/session";

export type AuthActionState = { error?: string };

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  is_active: number;
};

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = await getRequestIp();
  const genericError = "Email hoặc mật khẩu không đúng.";
  if (!email || email.length > 191 || password.length < 8 || password.length > 256) return { error: genericError };

  const [ipLimit, accountLimit] = await Promise.all([
    consumeRateLimit("admin-login-ip", ip, 10, 15 * 60),
    consumeRateLimit("admin-login-account", email, 5, 15 * 60)
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return { error: "Có quá nhiều lần đăng nhập. Vui lòng thử lại sau." };
  }

  const database = getDatabasePool();
  const [rows] = await database.execute<UserRow[]>(
    `SELECT id, email, password_hash, is_active FROM admin_users WHERE email = ? LIMIT 1`,
    [email]
  );
  const user = rows[0];
  const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  const valid = user?.is_active === 1 && passwordMatches;
  if (!valid) {
    await writeAuditLog({ actorEmail: email, action: "login_failed", resourceType: "auth", ipHash: hashSensitiveValue(ip) });
    return { error: genericError };
  }

  const connection = await database.getConnection();
  let session;
  try {
    await connection.beginTransaction();
    session = await createAdminSessionRecord(user.id, connection);
    await connection.execute(`UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
    await writeAuditLog({ actorUserId: user.id, actorEmail: user.email, action: "login_success", resourceType: "auth", ipHash: hashSensitiveValue(ip) }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
  await setAdminSessionCookie(session);
  redirect("/admin");
}

export async function logoutAction() {
  await revokeCurrentSession();
  redirect("/admin/login");
}
