"use client";

import { useActionState } from "react";
import type { CategoryActionState } from "@/app/(admin)/admin/actions/categories";

type Action = (state: CategoryActionState, formData: FormData) => Promise<CategoryActionState>;

export function CategoryForm({ action, initial, submitLabel }: { action: Action; initial?: { name: string; slug: string; sortOrder: number; isActive: boolean }; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="admin-inline-form"><input name="name" defaultValue={initial?.name} placeholder="Tên danh mục" maxLength={255} required /><input name="slug" defaultValue={initial?.slug} placeholder="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={191} required /><input name="sort_order" type="number" defaultValue={initial?.sortOrder ?? 0} aria-label="Thứ tự" required /><label className="admin-checkbox"><input name="is_active" type="checkbox" value="1" defaultChecked={initial?.isActive ?? true} /><span>Hoạt động</span></label><button className="admin-button" type="submit" disabled={pending}>{pending ? "Đang lưu…" : submitLabel}</button>{state.error ? <span className="admin-error">{state.error}</span> : null}</form>;
}
