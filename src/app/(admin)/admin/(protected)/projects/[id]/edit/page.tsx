import Link from "next/link";
import { notFound } from "next/navigation";
import { hardDeleteProjectAction, softDeleteProjectAction, updateProjectAction } from "@/app/(admin)/admin/actions/projects";
import { ProjectForm } from "@/components/admin/project-form";
import { getAdminProject } from "@/lib/admin/repository";
import { requireAdmin } from "@/lib/admin/session";

function htmlDate(value: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [project, user] = await Promise.all([getAdminProject(id), requireAdmin()]);
  if (!project) notFound();
  return <><header className="admin-page-header"><div><Link href="/admin/projects">← Dự án</Link><h1>Sửa dự án</h1></div><a className="admin-button" href="/projects" target="_blank" rel="noreferrer">Xem public</a></header><ProjectForm action={updateProjectAction.bind(null, id)} initial={{ name: project.name, client: project.client, pillar: project.pillar, location: project.location, contractValue: Number(project.contract_value_vnd), contractDate: htmlDate(project.contract_date), dateDisplay: project.date_display, isHighlight: Boolean(project.is_highlight), sortOrder: project.sort_order, status: project.status, images: (project.images ?? []).map((image) => ({ id: image.id, url: image.image_url, caption: image.caption ?? "", altText: image.alt_text ?? "" })) }} /><section className="admin-danger-zone"><h2>Vùng nguy hiểm</h2><form action={softDeleteProjectAction.bind(null, id)}><button className="admin-button admin-button-danger" type="submit">Đưa vào thùng rác</button></form>{user.role === "owner" ? <form action={hardDeleteProjectAction.bind(null, id)}><button className="admin-button admin-button-danger" type="submit">Xóa vĩnh viễn</button></form> : null}</section></>;
}
