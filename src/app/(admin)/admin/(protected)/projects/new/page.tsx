import Link from "next/link";
import { createProjectAction } from "@/app/(admin)/admin/actions/projects";
import { ProjectForm } from "@/components/admin/project-form";

export default function NewProjectPage() {
  return <><header className="admin-page-header"><div><Link href="/admin/projects">← Dự án</Link><h1>Thêm dự án</h1></div></header><ProjectForm action={createProjectAction} /></>;
}
