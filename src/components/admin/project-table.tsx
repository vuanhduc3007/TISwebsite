"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: number; name: string; client: string; pillar: string; status: string; image_count: number };

export function ProjectTable({ projects }: { projects: Item[] }) {
  const [search, setSearch] = useState("");
  const [pillar, setPillar] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = projects.filter((item) => `${item.name} ${item.client}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (pillar === "all" || item.pillar === pillar) && (status === "all" || item.status === status));
  return <><div className="admin-filters"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm dự án hoặc chủ đầu tư" /><select value={pillar} onChange={(event) => setPillar(event.target.value)}><option value="all">Tất cả lĩnh vực</option><option value="it">CNTT</option><option value="me">Cơ điện</option><option value="renewable">Năng lượng</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></div><p className="admin-result-count">{filtered.length} dự án</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên</th><th>Chủ đầu tư</th><th>Lĩnh vực</th><th>Ảnh</th><th>Trạng thái</th><th></th></tr></thead><tbody>{filtered.map((project) => <tr key={project.id}><td>{project.name}</td><td>{project.client}</td><td>{project.pillar}</td><td>{project.image_count}</td><td><span className={`admin-status admin-status-${project.status}`}>{project.status}</span></td><td><Link href={`/admin/projects/${project.id}/edit`}>Sửa</Link></td></tr>)}</tbody></table></div></>;
}
