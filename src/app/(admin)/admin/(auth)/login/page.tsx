import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin/session";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="admin-eyebrow">TIS CMS</p>
        <h1>Đăng nhập quản trị</h1>
        <p>Quản lý sản phẩm, dự án và danh mục của website.</p>
        <LoginForm />
      </section>
    </main>
  );
}
