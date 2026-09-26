import Link from "next/link";
import { notFound } from "next/navigation";
import { hardDeleteProductAction, softDeleteProductAction, updateProductAction } from "@/app/(admin)/admin/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminCategories, getAdminProduct } from "@/lib/admin/repository";
import { requireAdmin } from "@/lib/admin/session";

function parseSpecifications(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item): item is { label: string; value: string } => Boolean(item && typeof item.label === "string" && typeof item.value === "string")) : [];
  } catch { return []; }
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [product, categories, user] = await Promise.all([getAdminProduct(id), getAdminCategories(), requireAdmin()]);
  if (!product) notFound();
  const updateAction = updateProductAction.bind(null, id);
  const softDelete = softDeleteProductAction.bind(null, id);
  const hardDelete = hardDeleteProductAction.bind(null, id);
  return (
    <>
      <header className="admin-page-header"><div><Link href="/admin/products">← Sản phẩm</Link><h1>Sửa sản phẩm</h1></div><Link className="admin-button" href={`/admin/products/${product.id}/preview`}>Xem trước</Link></header>
      <ProductForm action={updateAction} categories={categories.map(({ id: categoryId, name, is_active }) => ({ id: categoryId, name, is_active }))} initial={{ name: product.name, slug: product.slug, categoryId: product.category_id, brand: product.brand, status: product.status, sortOrder: product.sort_order, description: product.description, imageAlt: product.image_alt, imageUrl: product.image_url, priceAmount: product.price_amount, priceLabel: product.price_label, specifications: parseSpecifications(product.specifications) }} />
      <section className="admin-danger-zone"><h2>Vùng nguy hiểm</h2><form action={softDelete}><button className="admin-button admin-button-danger" type="submit">Đưa vào thùng rác</button></form>{user.role === "owner" ? <form action={hardDelete}><button className="admin-button admin-button-danger" type="submit">Xóa vĩnh viễn</button></form> : null}</section>
    </>
  );
}
