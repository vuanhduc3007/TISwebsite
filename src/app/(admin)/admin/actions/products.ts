"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { deleteStoredImage, storeImage } from "@/lib/admin/media";
import { getAdminProduct } from "@/lib/admin/repository";
import { requireAdminForMutation } from "@/lib/admin/session";
import { AdminValidationError, enumValue, friendlyDatabaseError, integerValue, optionalInteger, optionalText, requiredText, slugValue, specificationsValue } from "@/lib/admin/validation";

export type ProductActionState = { error?: string };

function productInput(formData: FormData) {
  const priceAmount = optionalInteger(formData.get("price_amount"), "Giá", { min: 0 });
  const priceLabel = optionalText(formData.get("price_label"), "Nhãn giá", 100);
  return {
    name: requiredText(formData.get("name"), "Tên sản phẩm"),
    slug: slugValue(formData.get("slug")),
    categoryId: integerValue(formData.get("category_id"), "Danh mục", { min: 1 }),
    brand: requiredText(formData.get("brand"), "Thương hiệu", 100),
    status: enumValue(formData.get("status"), "Trạng thái", ["draft", "published"] as const),
    sortOrder: integerValue(formData.get("sort_order"), "Thứ tự", { min: -1_000_000, max: 1_000_000 }),
    description: optionalText(formData.get("description"), "Mô tả", 20_000),
    imageAlt: optionalText(formData.get("image_alt"), "Alt ảnh", 255),
    priceAmount,
    priceLabel,
    legacyPrice: priceAmount === null ? priceLabel || "Lien he" : String(priceAmount),
    specifications: specificationsValue(formData.get("specifications"))
  };
}

async function cleanupMedia(keys: Array<string | null | undefined>) {
  const results = await Promise.allSettled(keys.filter((key): key is string => Boolean(key)).map(deleteStoredImage));
  const failures = results.filter((result) => result.status === "rejected").length;
  if (failures) console.error("[admin media cleanup]", { failures });
}

export async function createProductAction(_state: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const actor = await requireAdminForMutation();
  let media: Awaited<ReturnType<typeof storeImage>> = null;
  let connection;
  let createdId = 0;
  try {
    const input = productInput(formData);
    const image = formData.get("image");
    if (image instanceof File && image.size) media = await storeImage(image, "products");
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO products
        (slug, category_id, name, price, price_amount, price_label, image_url, image_alt, image_storage_key, brand, status, sort_order, description, specifications)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.slug, input.categoryId, input.name, input.legacyPrice, input.priceAmount, input.priceLabel, media?.url ?? null, input.imageAlt, media?.storageKey ?? null, input.brand, input.status, input.sortOrder, input.description, JSON.stringify(input.specifications)]
    );
    createdId = result.insertId;
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "create", resourceType: "product", resourceId: createdId, details: { name: input.name, status: input.status } }, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (media) await cleanupMedia([media.storageKey]);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
  revalidatePath("/products");
  redirect(`/admin/products/${createdId}/edit?created=1`);
}

export async function updateProductAction(id: number, _state: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const actor = await requireAdminForMutation();
  const existing = await getAdminProduct(id);
  if (!existing) return { error: "Không tìm thấy sản phẩm." };
  let media: Awaited<ReturnType<typeof storeImage>> = null;
  let connection;
  let savedSlug = existing.slug;
  try {
    const input = productInput(formData);
    const image = formData.get("image");
    if (image instanceof File && image.size) media = await storeImage(image, "products");
    savedSlug = input.slug;
    connection = await getDatabasePool().getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`
      UPDATE products SET slug=?, category_id=?, name=?, price=?, price_amount=?, price_label=?,
        image_url=?, image_alt=?, image_storage_key=?, brand=?, status=?, sort_order=?, description=?, specifications=?
      WHERE id=? AND deleted_at IS NULL`,
      [input.slug, input.categoryId, input.name, input.legacyPrice, input.priceAmount, input.priceLabel, media?.url ?? existing.image_url, input.imageAlt, media?.storageKey ?? existing.image_storage_key, input.brand, input.status, input.sortOrder, input.description, JSON.stringify(input.specifications), id]
    );
    if (result.affectedRows !== 1) throw new AdminValidationError("Không tìm thấy sản phẩm.");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "update", resourceType: "product", resourceId: id, details: { name: input.name, status: input.status } }, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    if (media) await cleanupMedia([media.storageKey]);
    if (error instanceof AdminValidationError) return { error: error.message };
    return { error: friendlyDatabaseError(error) };
  } finally {
    connection?.release();
  }
  if (media && existing.image_storage_key) await cleanupMedia([existing.image_storage_key]);
  revalidatePath("/products");
  revalidatePath(`/products/${existing.slug}`);
  revalidatePath(`/products/${savedSlug}`);
  redirect(`/admin/products/${id}/edit?saved=1`);
}

export async function softDeleteProductAction(id: number) {
  const actor = await requireAdminForMutation();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`UPDATE products SET deleted_at=CURRENT_TIMESTAMP, status='draft' WHERE id=? AND deleted_at IS NULL`, [id]);
    if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "soft_delete", resourceType: "product", resourceId: id }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
}

export async function hardDeleteProductAction(id: number) {
  const actor = await requireAdminForMutation(["owner"]);
  const connection = await getDatabasePool().getConnection();
  let storageKey: string | null = null;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { image_storage_key: string | null })[]>(`SELECT image_storage_key FROM products WHERE id=? FOR UPDATE`, [id]);
    if (!rows[0]) throw new Error("NOT_FOUND");
    storageKey = rows[0].image_storage_key;
    await connection.execute(`DELETE FROM products WHERE id=?`, [id]);
    await writeAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: "hard_delete", resourceType: "product", resourceId: id }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
  await cleanupMedia([storageKey]);
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
}
