import Link from "next/link";
import { createProductAction } from "@/app/(admin)/admin/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminCategories } from "@/lib/admin/repository";

export default async function NewProductPage() {
  const categories = await getAdminCategories();
  return (
    <>
      <header className="admin-page-header"><div><Link href="/admin/products">← Sản phẩm</Link><h1>Thêm sản phẩm</h1></div></header>
      <ProductForm action={createProductAction} categories={categories.map(({ id, name, is_active }) => ({ id, name, is_active }))} />
    </>
  );
}
