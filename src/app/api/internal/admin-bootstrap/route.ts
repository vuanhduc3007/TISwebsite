import { timingSafeEqual } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/db";
import { hashPassword } from "@/lib/admin/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const databaseName = process.env.MYSQL_DATABASE?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || password.length < 12
    || password.length > 256
    || process.env.CONFIRM_ADMIN_CREATE !== databaseName) {
    return NextResponse.json({ ok: false, reason: "CONFIGURATION" }, { status: 503 });
  }

  const database = getDatabasePool();
  const connection = await database.getConnection();
  try {
    const [migrationRows] = await connection.execute<RowDataPacket[]>(
      "SELECT version FROM admin_schema_migrations WHERE version = '001_admin_cms' LIMIT 1",
    );
    if (!migrationRows[0]) {
      return NextResponse.json({ ok: false, reason: "MIGRATION" }, { status: 409 });
    }

    const [userRows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM admin_users");
    if (Number(userRows[0]?.count) !== 0) {
      return NextResponse.json({ ok: false, reason: "USERS_EXIST" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      "INSERT INTO admin_users (email, password_hash, role, is_active, must_change_password) VALUES (?, ?, 'owner', 1, 0)",
      [email, passwordHash],
    );
    await connection.execute(
      "INSERT INTO admin_audit_logs (actor_user_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, 'bootstrap_owner', 'admin_user', ?, ?)",
      [result.insertId, email, String(result.insertId), JSON.stringify({ role: "owner" })],
    );
    await connection.commit();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    await connection.rollback().catch(() => undefined);
    return NextResponse.json({ ok: false, reason: "INTERNAL" }, { status: 503 });
  } finally {
    connection.release();
  }
}
