import "server-only";

import { cache } from "react";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { getRequestIp } from "@/lib/admin/request";
import { TrustedProxyError } from "@/lib/admin/client-ip";
import { hashSessionToken } from "@/lib/admin/secret-hash";

export type AdminRole = "owner" | "editor";

export type AdminSessionUser = {
  id: number;
  email: string;
  role: AdminRole;
};

type SessionRow = RowDataPacket & AdminSessionUser & { session_id: number };

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_MINUTES = 30;
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-tis_admin_session" : "tis_admin_session";

function tokenHash(token: string) {
  return hashSessionToken(token, process.env);
}

export type NewAdminSession = { token: string; expiresAt: Date };

export async function createAdminSessionRecord(userId: number, executor: Pool | PoolConnection = getDatabasePool()): Promise<NewAdminSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(COOKIE_NAME)?.value;
  if (previousToken) {
    await executor.execute(`UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`, [tokenHash(previousToken)]);
  }
  await executor.execute<ResultSetHeader>(
    `INSERT INTO admin_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash(token), expiresAt]
  );
  await executor.execute(`DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)) LIMIT 100`);
  return { token, expiresAt };
}

export async function setAdminSessionCookie(session: NewAdminSession) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: session.expiresAt
  });
}

export async function createAdminSession(userId: number) {
  const session = await createAdminSessionRecord(userId);
  await setAdminSessionCookie(session);
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  try {
    if (token) {
      const database = getDatabasePool();
      await database.execute(`UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`, [tokenHash(token)]);
    }
  } finally {
    cookieStore.delete(COOKIE_NAME);
  }
}

export const getAdminSession = cache(async (): Promise<AdminSessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const database = getDatabasePool();
  const [rows] = await database.execute<SessionRow[]>(
    `SELECT s.id AS session_id, u.id, u.email, u.role
     FROM admin_sessions AS s
     INNER JOIN admin_users AS u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > CURRENT_TIMESTAMP
       AND s.last_seen_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${SESSION_IDLE_MINUTES} MINUTE)
       AND u.is_active = 1
     LIMIT 1`,
    [tokenHash(token)]
  );
  const row = rows[0];
  if (!row) return null;
  await database.execute(`UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`, [row.session_id]);
  return { id: row.id, email: row.email, role: row.role };
});

export async function requireAdmin(roles: AdminRole[] = ["owner", "editor"]) {
  const user = await getAdminSession();
  if (!user) redirect("/admin/login");
  if (!roles.includes(user.role)) forbidden();
  return user;
}

export async function requireAdminForMutation(roles: AdminRole[] = ["owner", "editor"]) {
  try {
    await getRequestIp();
  } catch (error) {
    if (error instanceof TrustedProxyError && error.status === 403) forbidden();
    throw error;
  }
  const user = await getAdminSession();
  if (!user) unauthorized();
  if (!roles.includes(user.role)) forbidden();
  return user;
}

export { COOKIE_NAME };
