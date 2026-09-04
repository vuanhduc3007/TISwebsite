import type { Metadata } from "next";
import { AboutBlueprintHero } from "@/components/about-blueprint-hero";
import { ProjectsGrid } from "@/components/projects-grid";
import { getProjects } from "@/lib/projects-repository";

export const metadata: Metadata = {
  title: "Dự án"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage() {
  const { projects, usedFallback } = await getProjects();

  return (
    <main>
      <AboutBlueprintHero
        title="Công trình cùng Công ty TIS"
        description="Từ hệ thống CNTT cho cơ quan nhà nước đến điện mặt trời mái nhà cho doanh nghiệp, Công ty TIS đã thực hiện nhiều dự án trên cả nước."
        eyebrow="// Công trình & Dự án"
        titleId="projects-blueprint-title"
        metricsIntro="Thống kê dự án"
        signature="TIS / PROJECTS"
        metrics={[
          { label: "Công trình thi công", value: "50+", detail: "Dự án đã & đang triển khai", offset: "none" },
          { label: "Lĩnh vực thực hiện", value: "03", detail: "CNTT · Cơ điện · Năng\u00A0lượng", offset: "small" },
          { label: "Khu vực triển khai", value: "20+", detail: "Tỉnh thành trên toàn quốc", offset: "large" }
        ]}
      />

      {usedFallback ? (
        <p className="site-shell pt-2 text-sm text-[var(--ink-muted)]">
          Đang dùng dữ liệu mẫu trên website. Chạy file{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">sql/projects.schema.sql</code> trên MySQL
          để quản lý dự án và album ảnh từ database.
        </p>
      ) : null}

      <ProjectsGrid projects={projects} />
    </main>
  );
}
