"use client";

import { useActionState, useMemo, useState } from "react";
import type { ProductActionState } from "@/app/(admin)/admin/actions/products";

type CategoryOption = { id: number; name: string; is_active: number };
type ProductInitial = {
  name?: string; slug?: string; categoryId?: number; brand?: string; status?: "draft" | "published";
  sortOrder?: number; description?: string | null; imageAlt?: string | null; imageUrl?: string | null;
  priceAmount?: number | null; priceLabel?: string | null; specifications?: Array<{ label: string; value: string }>;
};

type ProductFormAction = (state: ProductActionState, formData: FormData) => Promise<ProductActionState>;

export function ProductForm({ action, categories, initial = {} }: { action: ProductFormAction; categories: CategoryOption[]; initial?: ProductInitial }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [specs, setSpecs] = useState(initial.specifications ?? []);
  const specsJson = useMemo(() => JSON.stringify(specs), [specs]);
  return (
    <form action={formAction} className="admin-form admin-form-wide">
      <div className="admin-form-grid">
        <label><span>Tên sản phẩm *</span><input name="name" defaultValue={initial.name} maxLength={255} required /></label>
        <label><span>Slug *</span><input name="slug" defaultValue={initial.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={191} required /></label>
        <label><span>Danh mục *</span><select name="category_id" defaultValue={initial.categoryId} required>{categories.map((category) => <option key={category.id} value={category.id} disabled={!category.is_active}>{category.name}{category.is_active ? "" : " (đã tắt)"}</option>)}</select></label>
        <label><span>Thương hiệu *</span><input name="brand" defaultValue={initial.brand} maxLength={100} required /></label>
        <label><span>Trạng thái *</span><select name="status" defaultValue={initial.status ?? "draft"}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
        <label><span>Thứ tự *</span><input name="sort_order" type="number" defaultValue={initial.sortOrder ?? 0} required /></label>
        <label><span>Giá số (VNĐ)</span><input name="price_amount" type="number" min="0" defaultValue={initial.priceAmount ?? ""} /></label>
        <label><span>Nhãn giá thay thế</span><input name="price_label" defaultValue={initial.priceLabel ?? ""} placeholder="Liên hệ" maxLength={100} /></label>
      </div>
      <label><span>Mô tả</span><textarea name="description" rows={6} defaultValue={initial.description ?? ""} maxLength={20000} /></label>
      <div className="admin-form-grid">
        <label><span>Ảnh sản phẩm</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label><span>Alt ảnh</span><input name="image_alt" defaultValue={initial.imageAlt ?? ""} maxLength={255} /></label>
      </div>
      {initial.imageUrl ? <img className="admin-preview-image" src={initial.imageUrl} alt={initial.imageAlt ?? initial.name ?? "Ảnh sản phẩm"} /> : null}
      <fieldset className="admin-fieldset">
        <legend>Thông số kỹ thuật</legend>
        <input type="hidden" name="specifications" value={specsJson} />
        {specs.map((spec, index) => (
          <div className="admin-spec-row" key={index}>
            <input aria-label={`Nhãn thông số ${index + 1}`} value={spec.label} maxLength={120} onChange={(event) => setSpecs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Nhãn" />
            <input aria-label={`Giá trị thông số ${index + 1}`} value={spec.value} maxLength={500} onChange={(event) => setSpecs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Giá trị" />
            <button className="admin-button" type="button" onClick={() => setSpecs((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Xóa</button>
          </div>
        ))}
        <button className="admin-button" type="button" onClick={() => setSpecs((current) => [...current, { label: "", value: "" }])}>+ Thêm thông số</button>
      </fieldset>
      {state.error ? <p className="admin-error" role="alert">{state.error}</p> : null}
      <div className="admin-actions"><button className="admin-button admin-button-primary" type="submit" disabled={pending}>{pending ? "Đang lưu…" : "Lưu sản phẩm"}</button></div>
    </form>
  );
}
