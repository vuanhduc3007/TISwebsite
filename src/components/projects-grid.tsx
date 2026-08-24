"use client";

import Image from "next/image";
import {
  IconBuildingCommunity,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import type { Project, ProjectImage, ProjectPillar } from "@/lib/projects-contract";

type ProjectMediaProps = {
  title: string;
  images: ProjectImage[];
  layout: "compact" | "featured";
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function ProjectMedia({ title, images, layout }: ProjectMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const imageCount = images.length;
  const hasMultiple = imageCount > 1;

  const goTo = useCallback(
    (index: number) => {
      if (!imageCount) {
        return;
      }
      const normalized = ((index % imageCount) + imageCount) % imageCount;
      setActiveIndex(normalized);
    },
    [imageCount]
  );

  useEffect(() => {
    if (!hasMultiple || prefersReducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % imageCount);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [hasMultiple, imageCount, prefersReducedMotion]);

  if (!imageCount) {
    return null;
  }

  const frameClass =
    layout === "featured"
      ? "w-full lg:w-1/2 flex flex-col gap-2 shrink-0"
      : "w-full flex flex-col gap-2 mt-2";

  return (
    <div className={frameClass}>
      {/* Khung ảnh chính trực quan */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[var(--surface-muted)] border border-[var(--line)] shadow-xs group">
        {images.map((image, index) => (
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt}
            fill
            sizes={layout === "featured" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
            className={`object-cover transition-opacity duration-500 ease-out ${
              index === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            priority={index === 0}
          />
        ))}

        {/* Nút lùi / tiến ảnh trực tiếp trên thẻ */}
        {hasMultiple ? (
          <>
            <button
              type="button"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition shadow-md opacity-90 hover:scale-105 active:scale-95 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                goTo(activeIndex - 1);
              }}
              aria-label="Ảnh trước"
            >
              <IconChevronLeft size={20} stroke={2.2} />
            </button>
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition shadow-md opacity-90 hover:scale-105 active:scale-95 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                goTo(activeIndex + 1);
              }}
              aria-label="Ảnh tiếp theo"
            >
              <IconChevronRight size={20} stroke={2.2} />
            </button>

            {/* Chỉ số ảnh & tổng số ảnh */}
            <div className="absolute top-2.5 right-2.5 z-10 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm shadow-xs">
              {activeIndex + 1} / {imageCount} ảnh
            </div>

            {/* Dãy chấm nhỏ điều hướng (Dots indicator) */}
            <div className="absolute bottom-2.5 inset-x-0 z-10 flex justify-center items-center gap-1.5 pointer-events-none">
              {images.map((img, idx) => (
                <span
                  key={img.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeIndex ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Chú thích ảnh (nếu có) */}
      {images[activeIndex]?.caption ? (
        <p className="text-xs italic text-[var(--ink-muted)] line-clamp-1 px-1">
          {images[activeIndex].caption}
        </p>
      ) : null}

      {/* Dải ảnh nhỏ thu nhỏ (Thumbnails) để khách bấm xem ảnh khác trực tiếp */}
      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`relative h-11 w-16 sm:h-12 sm:w-18 shrink-0 overflow-hidden rounded-[8px] border-2 transition-all cursor-pointer ${
                index === activeIndex
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-[1.02] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
              onClick={(e) => {
                e.preventDefault();
                goTo(index);
              }}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={index === activeIndex}
            >
              <Image src={image.url} alt="" fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ProjectsGridProps = {
  projects: Project[];
};

const categoryTabs: { key: "all" | ProjectPillar; label: string }[] = [
  { key: "all", label: "Tất cả dự án" },
  { key: "it", label: "Công nghệ thông tin" },
  { key: "me", label: "Cơ điện & HVAC" },
  { key: "renewable", label: "Năng lượng tái tạo" }
];

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | ProjectPillar>("all");

  const filteredProjects = projects.filter(
    (p) => selectedCategory === "all" || p.pillar === selectedCategory
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => b.valueNumber - a.valueNumber);

  return (
    <section className="site-shell section-space pt-0">
      {/* Category Filter Tabs */}
      <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-4" aria-label="Bộ lọc danh mục dự án">
        {categoryTabs.map((tab) => {
          const isActive = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[var(--accent)] text-black shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:bg-[var(--line)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {sortedProjects.length === 0 ? (
        <div className="content-panel text-center py-12 text-[var(--ink-muted)]">
          Chưa có dự án nào thuộc danh mục này.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {sortedProjects.map((project) => {
            const isFeaturedLayout = project.isHighlight;

            return (
              <article
                key={project.id}
                className={`content-panel reveal flex flex-col justify-between ${
                  isFeaturedLayout ? "lg:col-span-2 lg:flex-row gap-8 border-2 border-[var(--accent)]" : "gap-5"
                }`}
              >
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <CategoryBadge pillar={project.pillar} />
                  </div>

                  <h2 className={`${isFeaturedLayout ? "text-2xl" : "text-xl"} font-bold text-[var(--ink)] leading-snug`}>
                    {project.name}
                  </h2>

                  <ProjectDetails project={project} />

                  <div className="mt-4 pt-4 border-t border-[var(--line)] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">Giá trị hợp đồng</p>
                      <p className="text-xl font-bold text-[var(--accent)]">{project.value}</p>
                    </div>
                  </div>
                </div>

                <ProjectMedia
                  title={project.name}
                  images={project.images}
                  layout={isFeaturedLayout ? "featured" : "compact"}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryBadge({ pillar }: { pillar: ProjectPillar }) {
  if (pillar === "it") {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
        Công nghệ thông tin
      </span>
    );
  }
  if (pillar === "me") {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
        Hệ thống cơ điện M&E
      </span>
    );
  }
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      Năng lượng tái tạo
    </span>
  );
}

function ProjectDetails({ project }: { project: Project }) {
  return (
    <div className="text-[var(--ink-muted)] text-sm space-y-2.5 mt-auto">
      <p className="flex items-start gap-2">
        <IconBuildingCommunity size={18} className="shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden />
        <span className="leading-tight text-[var(--ink)]">
          <strong className="font-semibold text-[var(--ink-muted)]">Chủ đầu tư: </strong>
          {project.client}
        </span>
      </p>
      {project.location ? (
        <p className="flex items-center gap-2">
          <IconMapPin size={18} className="shrink-0 text-[var(--accent)]" aria-hidden />
          <span className="text-[var(--ink)]">
            <strong className="font-semibold text-[var(--ink-muted)]">Địa điểm: </strong>
            {project.location}
          </span>
        </p>
      ) : null}
      <p className="flex items-center gap-2">
        <IconCalendar size={18} className="shrink-0 text-[var(--accent)]" aria-hidden />
        <span className="text-[var(--ink)]">
          <strong className="font-semibold text-[var(--ink-muted)]">Thời gian hoàn thành: </strong>
          {project.date}
        </span>
      </p>
    </div>
  );
}
