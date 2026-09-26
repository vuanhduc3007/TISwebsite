"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { getAdminCategory } from "@/lib/admin/repository";
import { requireAdminForMutation } from "@/lib/admin/session";
import { AdminValidationError, friendlyDatabaseError, integerValue, requiredText, slugValue } from "@/lib/admin/validation";

export type CategoryActionState = { error?: string };

function categoryInput(formData: FormData) {
  return {
    name: requiredText(formData.get("name"), "Tên danh mục"),
    slug: slugValue(formData.get("slug")),
    sortOrder: integerValue(formData.get("sort_order"), "Thứ tự", { min: -1_000_000, max: 1_000_000 }),
    isActive: formData.get("is_active") === "1" ? 1 : 0
  };
}

export async function createCategoryAction(_state: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const actor = await requireAdminForMutation();
  let connection;
  let createdId = 0;
  try {
    const input = categoryInput(formData);
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO categories (name, slug, sort_order, is_active) VALUES (?, ?, ?, ?)`,
      [input.name, input.slug, input.sortOrder, input.isActive]
    );
    createdId = result.insertId;
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "create", resourceType: "category", resourceId: createdId, details: { name: input.name } }, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
  revalidatePath("/products");
  redirect(`/admin/categories?created=${createdId}`);
}

export async function updateCategoryAction(id: number, _state: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const actor = await requireAdminForMutation();
  let connection;
  try {
    const input = categoryInput(formData);
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`UPDATE categories SET name=?, slug=?, sort_order=?, is_active=? WHERE id=?`, [input.name, input.slug, input.sortOrder, input.isActive, id]);
    if (result.affectedRows !== 1) throw new AdminValidationError("Không tìm thấy danh mục.");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "update", resourceType: "category", resourceId: id, details: { name: input.name } }, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
  revalidatePath("/products");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategoryAction(id: number) {
  const actor = await requireAdminForMutation(["owner"]);
  const category = await getAdminCategory(id);
  if (!category) throw new Error("NOT_FOUND");
  if (Number(category.product_count) > 0) throw new Error("CATEGORY_IN_USE");
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM categories WHERE id=?`, [id]);
    if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "delete", resourceType: "category", resourceId: id, details: { name: category.name } }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
  revalidatePath("/admin/categories");
}
