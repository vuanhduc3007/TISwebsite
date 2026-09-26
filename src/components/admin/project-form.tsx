"use client";

import { useActionState, useMemo, useState } from "react";
import type { ProjectActionState } from "@/app/(admin)/admin/actions/projects";

type ExistingImage = { id: number; url: string; caption: string; altText: string; remove?: boolean };
type InitialProject = { name?: string; client?: string; pillar?: "it" | "me" | "renewable"; location?: string | null; contractValue?: number; contractDate?: string; dateDisplay?: string | null; isHighlight?: boolean; sortOrder?: number; status?: "draft" | "published"; images?: ExistingImage[] };
type ProjectFormAction = (state: ProjectActionState, formData: FormData) => Promise<ProjectActionState>;

export function ProjectForm({ action, initial = {} }: { action: ProjectFormAction; initial?: InitialProject }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [images, setImages] = useState(initial.images ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const imagesJson = useMemo(() => JSON.stringify(images.map((image) => ({ id: image.id, caption: image.caption, altText: image.altText, remove: Boolean(image.remove) }))), [images]);
  function moveImage(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setImages((current) => { const next = [...current]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); return next; });
    setDragIndex(null);
  }
  return (
    <form action={formAction} className="admin-form admin-form-wide">
      <div className="admin-form-grid">
        <label><span>Tên dự án *</span><input name="name" defaultValue={initial.name} maxLength={255} required /></label>
        <label><span>Lĩnh vực *</span><select name="pillar" defaultValue={initial.pillar ?? "renewable"}><option value="it">Công nghệ thông tin</option><option value="me">Cơ điện & HVAC</option><option value="renewable">Năng lượng tái tạo</option></select></label>
      </div>
      <label><span>Chủ đầu tư *</span><textarea name="client" rows={3} defaultValue={initial.client} maxLength={2000} required /></label>
      <div className="admin-form-grid">
        <label><span>Địa điểm</span><input name="location" defaultValue={initial.location ?? ""} maxLength={255} /></label>
        <label><span>Giá trị hợp đồng (VNĐ)</span><input name="contract_value_vnd" type="number" min="0" defaultValue={initial.contractValue ?? 0} /></label>
        <label><span>Ngày hợp đồng</span><input name="contract_date" type="date" defaultValue={initial.contractDate ?? ""} /></label>
        <label><span>Chuỗi ngày hiển thị</span><input name="date_display" defaultValue={initial.dateDisplay ?? ""} maxLength={32} placeholder="04/2025" /></label>
        <label><span>Trạng thái</span><select name="status" defaultValue={initial.status ?? "draft"}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
        <label><span>Thứ tự</span><input name="sort_order" type="number" defaultValue={initial.sortOrder ?? 0} required /></label>
      </div>
      <label className="admin-checkbox"><input name="is_highlight" type="checkbox" value="1" defaultChecked={initial.isHighlight} /><span>Dự án nổi bật</span></label>
      <fieldset className="admin-fieldset">
        <legend>Album ảnh</legend>
        <input type="hidden" name="existing_images" value={imagesJson} />
        <p className="admin-help">Kéo thả để đổi thứ tự. Ảnh đầu tiên chưa bị xóa là ảnh cover.</p>
        <div className="admin-image-list">
          {images.map((image, index) => (
            <div className={`admin-image-item${image.remove ? " is-removed" : ""}`} draggable={!image.remove} onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveImage(index)} key={image.id}>
              <img src={image.url} alt={image.altText || image.caption || "Ảnh dự án"} />
              <div><strong>{index === 0 && !image.remove ? "Cover · " : ""}Ảnh #{image.id}</strong><input value={image.caption} maxLength={255} placeholder="Caption" onChange={(event) => setImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} /><input value={image.altText} maxLength={255} placeholder="Alt text" onChange={(event) => setImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, altText: event.target.value } : item))} /></div>
              <button className="admin-button" type="button" onClick={() => setImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, remove: !item.remove } : item))}>{image.remove ? "Hoàn tác" : "Xóa"}</button>
            </div>
          ))}
        </div>
        <label><span>Thêm ảnh (JPEG, PNG, WebP; tối đa 8 MB/ảnh)</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
      </fieldset>
      {state.error ? <p className="admin-error" role="alert">{state.error}</p> : null}
      <div className="admin-actions"><button className="admin-button admin-button-primary" type="submit" disabled={pending}>{pending ? "Đang lưu…" : "Lưu dự án"}</button></div>
    </form>
  );
}
