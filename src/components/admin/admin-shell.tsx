import Link from "next/link";
import type { AdminSessionUser } from "@/lib/admin/session";
import { logoutAction } from "@/app/(admin)/admin/actions/auth";

const links = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/projects", label: "Dự án" },
  { href: "/admin/categories", label: "Danh mục" }
];

export function AdminShell({ user, children }: { user: AdminSessionUser; children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">TIS Admin</Link>
        <nav aria-label="Điều hướng quản trị">
          {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
          {user.role === "owner" ? <Link href="/admin/audit-logs">Nhật ký</Link> : null}
          {user.role === "owner" ? <Link href="/admin/users">Tài khoản</Link> : null}
        </nav>
        <div className="admin-account">
          <span>{user.email}</span>
          <small>{user.role}</small>
          <form action={logoutAction}><button type="submit">Đăng xuất</button></form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
