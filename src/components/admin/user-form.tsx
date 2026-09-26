"use client";

import { useActionState } from "react";
import type { UserActionState } from "@/app/(admin)/admin/actions/users";

type Action = (state: UserActionState, formData: FormData) => Promise<UserActionState>;

export function UserForm({ action, initial, create = false }: { action: Action; initial?: { email: string; role: "owner" | "editor"; isActive: boolean }; create?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="admin-inline-form">{create ? <input name="email" type="email" placeholder="email@example.com" maxLength={191} required /> : <strong>{initial?.email}</strong>}<select name="role" defaultValue={initial?.role ?? "editor"}><option value="editor">Editor</option><option value="owner">Owner</option></select><input name="password" type="password" minLength={12} maxLength={256} placeholder={create ? "Mật khẩu (tối thiểu 12 ký tự)" : "Mật khẩu mới (để trống nếu giữ nguyên)"} required={create} />{!create ? <label className="admin-checkbox"><input name="is_active" type="checkbox" value="1" defaultChecked={initial?.isActive} /><span>Hoạt động</span></label> : null}<button className="admin-button" type="submit" disabled={pending}>{pending ? "Đang lưu…" : create ? "Tạo tài khoản" : "Cập nhật"}</button>{state.error ? <span className="admin-error">{state.error}</span> : null}{state.success ? <span className="admin-success">{state.success}</span> : null}</form>;
}
