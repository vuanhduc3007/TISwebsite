import "server-only";

import type { RowDataPacket } from "mysql2";
import { featuredProjects } from "@/content/projects-data";
import { DatabaseConfigurationError, getDatabasePool } from "@/lib/db";
import { resolveProjectImages, toProjectImageUrl } from "@/lib/project-image";
import type { Project, ProjectImage } from "@/lib/projects-contract";

type ProjectRow = RowDataPacket & {
  id: number;
  name: string;
  client: string;
  pillar: "it" | "me" | "renewable";
  location: string | null;
  contract_value_vnd: number;
  contract_date: Date | string | null;
  date_display: string | null;
  is_highlight: number;
};

type ProjectImageRow = RowDataPacket & {
  id: number;
  project_id: number;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

const LIST_PROJECTS_QUERY = `
  SELECT
    id,
    name,
    client,
    pillar,
    location,
    contract_value_vnd,
    contract_date,
    date_display,
    is_highlight
  FROM projects
  WHERE status = 'published'
  ORDER BY sort_order ASC, contract_value_vnd DESC, id DESC
`;

const LIST_PROJECT_IMAGES_QUERY = `
  SELECT
    pi.id,
    pi.project_id,
    pi.image_url,
    pi.caption,
    pi.sort_order
  FROM project_images AS pi
  INNER JOIN projects AS p ON p.id = pi.project_id
  WHERE p.status = 'published'
  ORDER BY pi.project_id ASC, pi.sort_order ASC, pi.id ASC
`;

/*
  Query gợi ý — lấy dự án kèm ảnh đại diện (cover) với fallback SQL khi chưa có album:

  SELECT
    p.id,
    p.name,
    p.client,
    p.pillar,
    p.location,
    p.contract_value_vnd,
    p.contract_date,
    p.date_display,
    p.is_highlight,
    COALESCE(
      (
        SELECT pi.image_url
        FROM project_images AS pi
        WHERE pi.project_id = p.id
        ORDER BY pi.sort_order ASC, pi.id ASC
        LIMIT 1
      ),
      CASE p.pillar
        WHEN 'it' THEN '/images/projects/hero_main.jpg'
        WHEN 'me' THEN '/images/projects/electrical-panel-installation.jpg'
        ELSE '/images/projects/cho-kim-tan-rooftop-panels-01.jpg'
      END
    ) AS cover_image_url
  FROM projects AS p
  WHERE p.status = 'published'
  ORDER BY p.sort_order ASC, p.contract_value_vnd DESC, p.id DESC;

  Lưu ý: app hiện dùng 2 query (projects + project_images) rồi gom ảnh ở TypeScript,
  và gọi resolveProjectImages() khi album rỗng — an toàn hơn JSON_ARRAYAGG khi LEFT JOIN.
*/

function formatContractValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Liên hệ";
  }

  return `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ`;
}

function formatProjectDate(contractDate: Date | string | null, dateDisplay: string | null) {
  const display = dateDisplay?.trim();
  if (display) {
    return display;
  }

  if (!contractDate) {
    return "";
  }

  const parsed = contractDate instanceof Date ? contractDate : new Date(contractDate);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN").format(parsed);
}

function mapImageRow(row: ProjectImageRow, projectName: string): ProjectImage {
  const caption = row.caption?.trim();
  return {
    id: row.id,
    url: toProjectImageUrl(row.image_url),
    alt: caption ? `${projectName} — ${caption}` : projectName,
    caption: caption || undefined
  };
}

function mapProjectRow(row: ProjectRow, images: ProjectImage[]): Project {
  const valueNumber = Number(row.contract_value_vnd) || 0;

  return {
    id: row.id,
    name: row.name.trim(),
    client: row.client.trim(),
    pillar: row.pillar,
    location: row.location?.trim() || undefined,
    valueNumber,
    value: formatContractValue(valueNumber),
    date: formatProjectDate(row.contract_date, row.date_display),
    isHighlight: Boolean(row.is_highlight),
    images: resolveProjectImages(images, row.pillar, row.name.trim())
  };
}

function mapStaticProjects(): Project[] {
  return featuredProjects.map((project, index) => {
    const images: ProjectImage[] = (project.images ?? (project.image ? [project.image] : [])).map(
      (url, imageIndex) => ({
        id: index * 100 + imageIndex,
        url: toProjectImageUrl(url),
        alt: project.name
      })
    );

    return {
      id: index + 1,
      name: project.name,
      client: project.client,
      pillar: project.pillar,
      location: project.location,
      valueNumber: project.valueNumber,
      value: project.value,
      date: project.date,
      isHighlight: project.valueNumber === 22186327987,
      images: resolveProjectImages(images, project.pillar, project.name)
    };
  });
}

async function queryProjectsFromDatabase() {
  const database = getDatabasePool();
  const [projectRows] = await database.query<ProjectRow[]>(LIST_PROJECTS_QUERY);

  if (!projectRows.length) {
    return [];
  }

  const [imageRows] = await database.query<ProjectImageRow[]>(LIST_PROJECT_IMAGES_QUERY);
  const imagesByProject = new Map<number, ProjectImageRow[]>();

  for (const row of imageRows) {
    const bucket = imagesByProject.get(row.project_id) ?? [];
    bucket.push(row);
    imagesByProject.set(row.project_id, bucket);
  }

  return projectRows.map((row) => {
    const imageRowsForProject = imagesByProject.get(row.id) ?? [];
    const images = imageRowsForProject.map((imageRow) => mapImageRow(imageRow, row.name.trim()));
    return mapProjectRow(row, images);
  });
}

export async function getProjects(): Promise<{ projects: Project[]; usedFallback: boolean }> {
  try {
    const projects = await queryProjectsFromDatabase();
    if (projects.length) {
      return { projects, usedFallback: false };
    }
  } catch {
    // Fall back to bundled project data when MySQL is unavailable or tables are empty.
  }

  return { projects: mapStaticProjects(), usedFallback: true };
}

export function getProjectRepositoryErrorMessage(error: unknown) {
  if (error instanceof DatabaseConfigurationError) {
    return "Chưa có cấu hình kết nối MySQL cho website.";
  }

  return "Không thể tải danh sách dự án từ MySQL. Đang hiển thị dữ liệu dự phòng.";
}
