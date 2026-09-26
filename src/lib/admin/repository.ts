import "server-only";

import type { RowDataPacket } from "mysql2";
import { getDatabasePool } from "@/lib/db";

export type AdminCategory = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: number;
  product_count: number;
};

export type AdminProduct = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  category_id: number;
  category_name: string;
  price_amount: number | null;
  price_label: string | null;
  price: string;
  image_url: string | null;
  image_alt: string | null;
  image_storage_key: string | null;
  brand: string;
  status: "draft" | "published";
  sort_order: number;
  description: string | null;
  specifications: unknown;
  deleted_at: Date | null;
  updated_at: Date;
};

export type AdminProjectImage = RowDataPacket & {
  id: number;
  project_id: number;
  image_url: string;
  caption: string | null;
  alt_text: string | null;
  storage_key: string | null;
  sort_order: number;
};

export type AdminProject = RowDataPacket & {
  id: number;
  name: string;
  client: string;
  pillar: "it" | "me" | "renewable";
  location: string | null;
  contract_value_vnd: number;
  contract_date: string | Date | null;
  date_display: string | null;
  is_highlight: number;
  sort_order: number;
  status: "draft" | "published";
  deleted_at: Date | null;
  updated_at: Date;
  image_count: number;
  images?: AdminProjectImage[];
};

export async function getAdminDashboardCounts() {
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS products,
      (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'draft') AS draft_products,
      (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) AS projects,
      (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND status = 'draft') AS draft_projects,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM admin_users WHERE is_active = 1) AS users
  `);
  return rows[0] as { products: number; draft_products: number; projects: number; draft_projects: number; categories: number; users: number };
}

export async function getAdminCategories() {
  const [rows] = await getDatabasePool().query<AdminCategory[]>(`
    SELECT c.id, c.name, c.slug, c.sort_order, c.is_active, COUNT(p.id) AS product_count
    FROM categories AS c
    LEFT JOIN products AS p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `);
  return rows;
}

export async function getAdminCategory(id: number) {
  const [rows] = await getDatabasePool().execute<AdminCategory[]>(`
    SELECT c.id, c.name, c.slug, c.sort_order, c.is_active,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c WHERE c.id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function getAdminProducts() {
  const [rows] = await getDatabasePool().query<AdminProduct[]>(`
    SELECT p.*, c.name AS category_name
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL
    ORDER BY p.sort_order ASC, p.id DESC
  `);
  return rows;
}

export async function getAdminProduct(id: number) {
  const [rows] = await getDatabasePool().execute<AdminProduct[]>(`
    SELECT p.*, c.name AS category_name
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function getAdminProjects() {
  const [rows] = await getDatabasePool().query<AdminProject[]>(`
    SELECT p.*, COUNT(pi.id) AS image_count
    FROM projects p
    LEFT JOIN project_images pi ON pi.project_id = p.id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.id DESC
  `);
  return rows;
}

export async function getAdminProject(id: number) {
  const database = getDatabasePool();
  const [rows] = await database.execute<AdminProject[]>(`
    SELECT p.*, (SELECT COUNT(*) FROM project_images pi WHERE pi.project_id = p.id) AS image_count
    FROM projects p WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1`, [id]);
  const project = rows[0];
  if (!project) return null;
  const [images] = await database.execute<AdminProjectImage[]>(`
    SELECT id, project_id, image_url, caption, alt_text, storage_key, sort_order
    FROM project_images WHERE project_id = ? ORDER BY sort_order ASC, id ASC`, [id]);
  project.images = images;
  return project;
}

export async function getAdminUsers() {
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT id, email, role, is_active, must_change_password, last_login_at, created_at, updated_at
    FROM admin_users ORDER BY id ASC
  `);
  return rows as Array<{ id: number; email: string; role: "owner" | "editor"; is_active: number; must_change_password: number; last_login_at: Date | null; created_at: Date; updated_at: Date }>;
}

export async function getAuditLogs(limit = 100) {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT id, actor_email, action, resource_type, resource_id, details, created_at
    FROM admin_audit_logs ORDER BY id DESC LIMIT ${safeLimit}
  `);
  return rows as Array<{ id: number; actor_email: string | null; action: string; resource_type: string; resource_id: string | null; details: unknown; created_at: Date }>;
}
