import Link from "next/link";
import { ProductTable } from "@/components/admin/product-table";
import { getAdminProducts } from "@/lib/admin/repository";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return (
    <>
      <header className="admin-page-header"><div><p className="admin-eyebrow">Nội dung</p><h1>Sản phẩm</h1></div><Link className="admin-button admin-button-primary" href="/admin/products/new">Thêm sản phẩm</Link></header>
      <ProductTable products={products.map((item) => ({ id: item.id, name: item.name, brand: item.brand, category_name: item.category_name, status: item.status, price_amount: item.price_amount, price_label: item.price_label }))} />
    </>
  );
}
