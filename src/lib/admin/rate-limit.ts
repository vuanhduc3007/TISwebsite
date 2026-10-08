import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { hashSensitiveValue } from "@/lib/admin/request";
import { consumeFixedWindow } from "./fixed-window";

type RateRow = RowDataPacket & { request_count: number };

export async function consumeRateLimit(scope: string, key: string, limit: number, windowSeconds: number) {
  const database = getDatabasePool();
  const keyHash = hashSensitiveValue(key);
  return consumeFixedWindow({
    async increment(scope, hash, windowStart, expiresAt) {
      await database.execute<ResultSetHeader>(`INSERT INTO rate_limits (scope, key_hash, window_start, request_count, expires_at)
     VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1, expires_at = VALUES(expires_at)`,
        [scope, hash, windowStart, expiresAt]);
    },
    async count(scope, hash, windowStart) {
      const [rows] = await database.execute<RateRow[]>(
        `SELECT request_count FROM rate_limits WHERE scope = ? AND key_hash = ? AND window_start = ? LIMIT 1`,
        [scope, hash, windowStart]);
      return rows[0]?.request_count;
    },
    async prune() {
      await database.execute(`DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP LIMIT 100`);
    }
  }, scope, keyHash, limit, windowSeconds);
}
