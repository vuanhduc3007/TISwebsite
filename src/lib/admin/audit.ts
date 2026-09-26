import "server-only";

import type { Pool, PoolConnection } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";

type AuditInput = {
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  ipHash?: string | null;
  details?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditInput, executor: Pool | PoolConnection = getDatabasePool()) {
  await executor.execute(
    `INSERT INTO admin_audit_logs
      (actor_user_id, actor_email, action, resource_type, resource_id, ip_hash, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.actorUserId ?? null, input.actorEmail ?? null, input.action, input.resourceType, input.resourceId == null ? null : String(input.resourceId), input.ipHash ?? null, input.details ? JSON.stringify(input.details) : null]
  );
}
