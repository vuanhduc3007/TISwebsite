import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { hashSensitiveValue } from "@/lib/admin/request";

type RateRow = RowDataPacket & { request_count: number };

export async function consumeRateLimit(scope: string, key: string, limit: number, windowSeconds: number) {
  const database = getDatabasePool();
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + windowSeconds * 2000);
  const keyHash = hashSensitiveValue(key);

  await database.execute<ResultSetHeader>(
    `INSERT INTO rate_limits (scope, key_hash, window_start, request_count, expires_at)
     VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1, expires_at = VALUES(expires_at)`,
    [scope, keyHash, windowStart, expiresAt]
  );
  const [rows] = await database.execute<RateRow[]>(
    `SELECT request_count FROM rate_limits WHERE scope = ? AND key_hash = ? AND window_start = ? LIMIT 1`,
    [scope, keyHash, windowStart]
  );
  // Bound table growth without making cleanup a separate destructive rollout step.
  await database.execute(`DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP LIMIT 100`).catch(() => undefined);
  return { allowed: (rows[0]?.request_count ?? limit + 1) <= limit, retryAfter: Math.max(1, Math.ceil((windowStartMs + windowSeconds * 1000 - now) / 1000)) };
}
