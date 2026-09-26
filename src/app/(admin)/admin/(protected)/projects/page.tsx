import Link from "next/link";
import { ProjectTable } from "@/components/admin/project-table";
import { getAdminProjects } from "@/lib/admin/repository";

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects();
  return <><header className="admin-page-header"><div><p className="admin-eyebrow">Nội dung</p><h1>Dự án</h1></div><Link className="admin-button admin-button-primary" href="/admin/projects/new">Thêm dự án</Link></header><ProjectTable projects={projects.map(({ id, name, client, pillar, status, image_count }) => ({ id, name, client, pillar, status, image_count: Number(image_count) }))} /></>;
}
