import { createUserAction, updateUserAction } from "@/app/(admin)/admin/actions/users";
import { UserForm } from "@/components/admin/user-form";
import { getAdminUsers } from "@/lib/admin/repository";
import { requireAdmin } from "@/lib/admin/session";

export default async function UsersPage() {
  await requireAdmin(["owner"]);
  const users = await getAdminUsers();
  return <><header className="admin-page-header"><div><p className="admin-eyebrow">Bảo mật</p><h1>Tài khoản quản trị</h1></div></header><section className="admin-panel"><h2>Tạo tài khoản</h2><UserForm action={createUserAction} create /></section><section className="admin-panel"><h2>Tài khoản hiện có</h2><div className="admin-stack">{users.map((user) => <div className="admin-list-card" key={user.id}><UserForm action={updateUserAction.bind(null, user.id)} initial={{ email: user.email, role: user.role, isActive: Boolean(user.is_active) }} /></div>)}</div></section></>;
}
