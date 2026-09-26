"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = { id: number; name: string; brand: string; category_name: string; status: string; price_amount: number | null; price_label: string | null };

export function ProductTable({ products }: { products: Item[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => Array.from(new Set(products.map((item) => item.category_name))).sort(), [products]);
  const filtered = products.filter((item) => {
    const haystack = `${item.name} ${item.brand}`.toLocaleLowerCase("vi");
    return haystack.includes(search.toLocaleLowerCase("vi")) && (status === "all" || item.status === status) && (category === "all" || item.category_name === category);
  });
  return (
    <>
      <div className="admin-filters">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc thương hiệu" />
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Tất cả danh mục</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select>
      </div>
      <p className="admin-result-count">{filtered.length} sản phẩm</p>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên</th><th>Danh mục</th><th>Thương hiệu</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {filtered.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category_name}</td><td>{product.brand}</td><td>{product.price_amount == null ? product.price_label || "Liên hệ" : new Intl.NumberFormat("vi-VN").format(product.price_amount)}</td><td><span className={`admin-status admin-status-${product.status}`}>{product.status}</span></td><td><Link href={`/admin/products/${product.id}/edit`}>Sửa</Link></td></tr>)}
      </tbody></table></div>
    </>
  );
}
