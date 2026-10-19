import "server-only";

import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { AdminValidationError } from "@/lib/admin/validation";

export type LockedAdminUser = { id: number; role: "owner" | "editor"; is_active: number };

export function userIdValue(value: unknown): number {
  // Server Action arguments are untrusted at runtime, regardless of TS types.
  // The UI binds numeric DB IDs; do not allow SQL to coerce another JS type.
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new AdminValidationError("ID tài khoản không hợp lệ.");
  }
  return value;
}

export async function lockAdminUsersForMutation(connection: PoolConnection, actorId: number) {
  // Account mutations are rare. Use the same ordered locking read for every
  // mutation so two owners cannot both act on stale authorization/owner counts.
  // This must run inside the transaction that writes the account and audit log.
  const [users] = await connection.execute<Array<LockedAdminUser & RowDataPacket>>(
    `SELECT id, role, is_active FROM admin_users ORDER BY id FOR UPDATE`
  );
  const actor = users.find((user) => user.id === actorId);
  if (actor?.role !== "owner" || actor.is_active !== 1) {
    throw new AdminValidationError("Phiên đăng nhập không còn quyền owner.");
  }
  return users;
}

export function assertUserUpdateAllowed(
  users: readonly LockedAdminUser[],
  actorId: number,
  targetId: number,
  role: "owner" | "editor",
  isActive: number
) {
  const target = users.find((user) => user.id === targetId);
  if (!target) throw new AdminValidationError("Không tìm thấy tài khoản.");

  const removesActiveOwner = target.role === "owner" && target.is_active === 1
    && (role !== "owner" || isActive !== 1);
  if (removesActiveOwner && users.filter((user) => user.role === "owner" && user.is_active === 1).length <= 1) {
    throw new AdminValidationError("Phải giữ ít nhất một tài khoản owner đang hoạt động.");
  }
  if (targetId === actorId && (isActive !== 1 || role !== "owner")) {
    throw new AdminValidationError("Bạn không thể tự vô hiệu hóa hoặc hạ quyền tài khoản đang đăng nhập.");
  }
  return target;
}
