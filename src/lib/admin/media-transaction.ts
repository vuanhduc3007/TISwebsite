import "server-only";

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { deleteStoredImage } from "@/lib/admin/media";

export const MEDIA_OUTCOME_UNKNOWN = {
  errorCode: "SAVE_OUTCOME_UNKNOWN" as const,
  error: "Chưa xác nhận được kết quả lưu. Hãy tải lại danh sách và kiểm tra dữ liệu trước khi gửi lại; ảnh được giữ lại để đối soát."
};

/** MySQL may commit even when the acknowledgement never reaches this process. */
export class MediaTransaction {
  private commitAttempted = false;
  private discarded = false;
  private connection: PoolConnection;

  constructor(connection: PoolConnection) {
    this.connection = connection;
  }

  async commit() {
    // Set BEFORE the call, including synchronous driver failures. A later
    // ROLLBACK acknowledgement cannot prove that this COMMIT did not succeed.
    this.commitAttempted = true;
    await this.connection.commit();
  }

  /** true only when it is safe to delete this operation's newly uploaded keys. */
  async abort(): Promise<boolean> {
    if (this.commitAttempted) {
      this.discard();
      return false;
    }
    try {
      await this.connection.rollback();
      return true;
    } catch {
      this.discard();
      return false;
    }
  }

  private discard() {
    if (!this.discarded) {
      this.discarded = true;
      // Never return an uncertain / still-in-transaction connection to the pool.
      this.connection.destroy();
    }
  }

  release() {
    if (!this.discarded) this.connection.release();
  }
}

function uniqueKeys(keys: Array<string | null | undefined>) {
  return [...new Set(keys.filter((key): key is string => Boolean(key)))];
}

/** Only for fresh server-generated keys that never committed a DB reference. */
export async function cleanupUncommittedMedia(keys: Array<string | null | undefined>) {
  const results = await Promise.allSettled(uniqueKeys(keys).map(deleteStoredImage));
  const failures = results.filter((result) => result.status === "rejected").length;
  if (failures) console.error("[admin media cleanup]", { failures, phase: "uncommitted" });
}

/**
 * Call only after acknowledged COMMIT and after releasing the transaction.
 * Keep assets if another row references them, or if the reference check fails.
 * Mutation actions never accept/reuse a caller-supplied storage key, and read
 * current media under the parent row lock, so they cannot resurrect a detached
 * key after this check. Offline imports/restores/reconciliation must quiesce writes.
 */
export async function cleanupDetachedMedia(keys: Array<string | null | undefined>) {
  let failures = 0;
  for (const key of uniqueKeys(keys)) {
    try {
      const [references] = await getDatabasePool().execute<RowDataPacket[]>(`
        SELECT 1 AS referenced FROM products WHERE image_storage_key=?
        UNION ALL
        SELECT 1 AS referenced FROM project_images WHERE storage_key=?
        LIMIT 1`, [key, key]);
      if (!references.length) await deleteStoredImage(key);
    } catch {
      // A failed delete is an orphan candidate, never a reason to undo a commit
      // or tell the editor to submit the already-saved mutation again.
      failures++;
    }
  }
  if (failures) console.error("[admin media cleanup]", { failures, phase: "detached" });
}
