import { getAuditLogs } from "@/lib/admin/repository";
import { requireAdmin } from "@/lib/admin/session";

export default async function AuditLogsPage() {
  await requireAdmin(["owner"]);
  const logs = await getAuditLogs();
  return <><header className="admin-page-header"><div><p className="admin-eyebrow">An toàn vận hành</p><h1>Nhật ký quản trị</h1></div></header><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Tài nguyên</th><th>Chi tiết</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(log.created_at))}</td><td>{log.actor_email ?? "Hệ thống"}</td><td>{log.action}</td><td>{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ""}</td><td><code>{log.details ? JSON.stringify(log.details) : "—"}</code></td></tr>)}</tbody></table></div></>;
}
