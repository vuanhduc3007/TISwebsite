"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { storeImage } from "@/lib/admin/media";
import { cleanupDetachedMedia, cleanupUncommittedMedia, MEDIA_OUTCOME_UNKNOWN, MediaTransaction } from "@/lib/admin/media-transaction";
import { requireAdminForMutation } from "@/lib/admin/session";
import { AdminValidationError, dateValue, enumValue, friendlyDatabaseError, integerValue, optionalInteger, optionalText, requiredText } from "@/lib/admin/validation";

export type ProjectActionState = { error?: string; errorCode?: "SAVE_OUTCOME_UNKNOWN" };

type ImageInput = { id: number; caption: string | null; altText: string | null; sortOrder: number; remove: boolean };
const MAX_PROJECT_IMAGES_PER_REQUEST = 10;
const MAX_PROJECT_UPLOAD_BYTES = 18 * 1024 * 1024;

function projectInput(formData: FormData) {
  return {
    name: requiredText(formData.get("name"), "Tên dự án"),
    client: requiredText(formData.get("client"), "Chủ đầu tư", 2_000),
    pillar: enumValue(formData.get("pillar"), "Lĩnh vực", ["it", "me", "renewable"] as const),
    location: optionalText(formData.get("location"), "Địa điểm", 255),
    contractValue: optionalInteger(formData.get("contract_value_vnd"), "Giá trị hợp đồng", { min: 0 }) ?? 0,
    contractDate: dateValue(formData.get("contract_date"), "Ngày hợp đồng"),
    dateDisplay: optionalText(formData.get("date_display"), "Ngày hiển thị", 32),
    isHighlight: formData.get("is_highlight") === "1" ? 1 : 0,
    sortOrder: integerValue(formData.get("sort_order"), "Thứ tự", { min: -1_000_000, max: 1_000_000 }),
    status: enumValue(formData.get("status"), "Trạng thái", ["draft", "published"] as const)
  };
}

function imageInputs(value: FormDataEntryValue | null): ImageInput[] {
  if (typeof value !== "string" || !value) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new AdminValidationError("Danh sách ảnh không hợp lệ."); }
  if (!Array.isArray(parsed) || parsed.length > 200) throw new AdminValidationError("Danh sách ảnh không hợp lệ.");
  const result = parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new AdminValidationError("Thông tin ảnh không hợp lệ.");
    const record = item as Record<string, unknown>;
    const id = Number(record.id);
    const caption = String(record.caption ?? "").trim();
    const altText = String(record.altText ?? "").trim();
    if (!Number.isSafeInteger(id) || id < 1 || caption.length > 255 || altText.length > 255) throw new AdminValidationError("Thông tin ảnh không hợp lệ.");
    return { id, caption: caption || null, altText: altText || null, sortOrder: index, remove: record.remove === true };
  });
  if (new Set(result.map((image) => image.id)).size !== result.length) throw new AdminValidationError("Danh sách ảnh bị trùng lặp.");
  return result;
}

async function uploadProjectFiles(formData: FormData) {
  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > MAX_PROJECT_IMAGES_PER_REQUEST) throw new AdminValidationError(`Chỉ được upload tối đa ${MAX_PROJECT_IMAGES_PER_REQUEST} ảnh mỗi lần.`);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_PROJECT_UPLOAD_BYTES) throw new AdminValidationError("Tổng dung lượng ảnh upload quá lớn.");
  const stored: NonNullable<Awaited<ReturnType<typeof storeImage>>>[] = [];
  try {
    for (const entry of files) {
      const media = await storeImage(entry, "projects");
      if (media) stored.push(media);
    }
    return stored;
  } catch (error) {
    await cleanupUncommittedMedia(stored.map((item) => item.storageKey));
    throw error;
  }
}

export async function createProjectAction(_state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const actor = await requireAdminForMutation();
  const uploaded = [] as Awaited<ReturnType<typeof uploadProjectFiles>>;
  let connection;
  let transaction: MediaTransaction | undefined;
  let createdId = 0;
  try {
    const input = projectInput(formData);
    uploaded.push(...await uploadProjectFiles(formData));
    connection = await getDatabasePool().getConnection();
    transaction = new MediaTransaction(connection);
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO projects (name, client, pillar, location, contract_value_vnd, contract_date, date_display, is_highlight, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.name, input.client, input.pillar, input.location, input.contractValue, input.contractDate, input.dateDisplay, input.isHighlight, input.sortOrder, input.status]
    );
    for (const [index, media] of uploaded.entries()) {
      await connection.execute(`INSERT INTO project_images (project_id, image_url, storage_key, mime_type, file_size, width, height, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [result.insertId, media.url, media.storageKey, media.mimeType, media.fileSize, media.width, media.height, index]);
    }
    createdId = result.insertId;
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "create", resourceType: "project", resourceId: createdId, details: { name: input.name, status: input.status, images: uploaded.length } }, connection);
    await transaction.commit();
  } catch (error) {
    const canDiscardUploads = transaction ? await transaction.abort() : true;
    if (canDiscardUploads) await cleanupUncommittedMedia(uploaded.map((item) => item.storageKey));
    if (!canDiscardUploads) return { ...MEDIA_OUTCOME_UNKNOWN };
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    transaction?.release();
  }
  revalidatePath("/projects");
  redirect(`/admin/projects/${createdId}/edit?created=1`);
}

export async function updateProjectAction(id: number, _state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const actor = await requireAdminForMutation();
  const uploaded = [] as Awaited<ReturnType<typeof uploadProjectFiles>>;
  const deletedStorageKeys: string[] = [];
  let connection;
  let transaction: MediaTransaction | undefined;
  try {
    const input = projectInput(formData);
    const images = imageInputs(formData.get("existing_images"));
    uploaded.push(...await uploadProjectFiles(formData));
    connection = await getDatabasePool().getConnection();
    transaction = new MediaTransaction(connection);
    await connection.beginTransaction();
    // Every album mutation locks the parent first, including hard delete. Read
    // image membership only after that lock so stale forms cannot delete or
    // update an image that another save already removed.
    const [projects] = await connection.execute<RowDataPacket[]>(`SELECT id FROM projects WHERE id=? AND deleted_at IS NULL FOR UPDATE`, [id]);
    if (!projects[0]) throw new AdminValidationError("Không tìm thấy dự án.");
    const [currentImages] = await connection.execute<(RowDataPacket & { id: number; storage_key: string | null; sort_order: number })[]>(`
      SELECT id, storage_key, sort_order FROM project_images WHERE project_id=? FOR UPDATE`, [id]);
    const [updateResult] = await connection.execute<ResultSetHeader>(`UPDATE projects SET name=?, client=?, pillar=?, location=?, contract_value_vnd=?, contract_date=?, date_display=?, is_highlight=?, sort_order=?, status=? WHERE id=? AND deleted_at IS NULL`, [input.name, input.client, input.pillar, input.location, input.contractValue, input.contractDate, input.dateDisplay, input.isHighlight, input.sortOrder, input.status, id]);
    if (updateResult.affectedRows !== 1) throw new AdminValidationError("Không tìm thấy dự án.");
    const ownedImages = new Map(currentImages.map((image) => [image.id, image]));
    for (const image of images) {
      const original = ownedImages.get(image.id);
      if (!original) throw new AdminValidationError("Danh sách ảnh đã thay đổi hoặc ảnh không thuộc dự án này. Hãy tải lại trang trước khi lưu.");
      if (image.remove) {
        const [deleted] = await connection.execute<ResultSetHeader>(`DELETE FROM project_images WHERE id=? AND project_id=?`, [image.id, id]);
        if (deleted.affectedRows !== 1) throw new AdminValidationError("Danh sách ảnh đã thay đổi. Hãy tải lại trang trước khi lưu.");
        if (original.storage_key) deletedStorageKeys.push(original.storage_key);
      } else {
        const [updated] = await connection.execute<ResultSetHeader>(`UPDATE project_images SET caption=?, alt_text=?, sort_order=? WHERE id=? AND project_id=?`, [image.caption, image.altText, image.sortOrder, image.id, id]);
        if (updated.affectedRows !== 1) throw new AdminValidationError("Danh sách ảnh đã thay đổi. Hãy tải lại trang trước khi lưu.");
      }
    }
    // A stale form may omit images another editor just added. Keep those rows
    // and append new uploads after both their current and the submitted order.
    const submitted = new Map(images.map((image) => [image.id, image]));
    const lastOrder = currentImages.reduce((maximum, image) => {
      const input = submitted.get(image.id);
      return input?.remove ? maximum : Math.max(maximum, input?.sortOrder ?? image.sort_order);
    }, -1);
    const startOrder = lastOrder + 1;
    for (const [index, media] of uploaded.entries()) {
      await connection.execute(`INSERT INTO project_images (project_id, image_url, storage_key, mime_type, file_size, width, height, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, media.url, media.storageKey, media.mimeType, media.fileSize, media.width, media.height, startOrder + index]);
    }
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "update", resourceType: "project", resourceId: id, details: { name: input.name, status: input.status, uploaded: uploaded.length, removed: deletedStorageKeys.length } }, connection);
    await transaction.commit();
  } catch (error) {
    const canDiscardUploads = transaction ? await transaction.abort() : true;
    if (canDiscardUploads) await cleanupUncommittedMedia(uploaded.map((item) => item.storageKey));
    if (!canDiscardUploads) return { ...MEDIA_OUTCOME_UNKNOWN };
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    transaction?.release();
  }
  await cleanupDetachedMedia(deletedStorageKeys);
  revalidatePath("/projects");
  redirect(`/admin/projects/${id}/edit?saved=1`);
}

export async function softDeleteProjectAction(id: number) {
  const actor = await requireAdminForMutation();
  const connection = await getDatabasePool().getConnection();
  const transaction = new MediaTransaction(connection);
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`UPDATE projects SET deleted_at=CURRENT_TIMESTAMP, status='draft' WHERE id=? AND deleted_at IS NULL`, [id]);
    if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "soft_delete", resourceType: "project", resourceId: id }, connection);
    await transaction.commit();
  } catch (error) {
    if (!await transaction.abort()) throw new Error(MEDIA_OUTCOME_UNKNOWN.error);
    throw error;
  } finally {
    transaction.release();
  }
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?deleted=1");
}

export async function hardDeleteProjectAction(id: number) {
  const actor = await requireAdminForMutation(["owner"]);
  const connection = await getDatabasePool().getConnection();
  const transaction = new MediaTransaction(connection);
  let storageKeys: Array<string | null> = [];
  try {
    await connection.beginTransaction();
    const [projectRows] = await connection.execute<(RowDataPacket & { id: number })[]>(`SELECT id FROM projects WHERE id=? FOR UPDATE`, [id]);
    if (!projectRows[0]) throw new Error("NOT_FOUND");
    const [rows] = await connection.execute<(RowDataPacket & { storage_key: string | null })[]>(`SELECT storage_key FROM project_images WHERE project_id=? FOR UPDATE`, [id]);
    storageKeys = rows.map((row) => row.storage_key);
    const [deleted] = await connection.execute<ResultSetHeader>(`DELETE FROM projects WHERE id=?`, [id]);
    if (deleted.affectedRows !== 1) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "hard_delete", resourceType: "project", resourceId: id }, connection);
    await transaction.commit();
  } catch (error) {
    if (!await transaction.abort()) throw new Error(MEDIA_OUTCOME_UNKNOWN.error);
    throw error;
  } finally {
    transaction.release();
  }
  await cleanupDetachedMedia(storageKeys);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?deleted=1");
}
