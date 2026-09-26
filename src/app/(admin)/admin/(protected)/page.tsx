import Link from "next/link";
import { getAdminDashboardCounts } from "@/lib/admin/repository";

export default async function AdminDashboardPage() {
  const counts = await getAdminDashboardCounts();
  const cards = [
    { label: "Sản phẩm", value: counts.products, note: `${counts.draft_products} bản nháp`, href: "/admin/products" },
    { label: "Dự án", value: counts.projects, note: `${counts.draft_projects} bản nháp`, href: "/admin/projects" },
    { label: "Danh mục", value: counts.categories, note: "Phân loại sản phẩm", href: "/admin/categories" },
    { label: "Tài khoản", value: counts.users, note: "Đang hoạt động", href: "/admin/users" }
  ];
  return (
    <>
      <header className="admin-page-header"><div><p className="admin-eyebrow">Tổng quan</p><h1>Bảng điều khiển</h1></div></header>
      <div className="admin-stats">
        {cards.map((card) => <Link className="admin-stat" href={card.href} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></Link>)}
      </div>
    </>
  );
}
