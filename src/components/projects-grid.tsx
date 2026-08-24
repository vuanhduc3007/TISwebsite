"use client";

import Image from "next/image";
import {
  IconBuildingCommunity,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconPhoto,
  IconReceiptTax,
  IconX
} from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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
    if (!hasMultiple || lightboxOpen || prefersReducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % imageCount);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [hasMultiple, imageCount, lightboxOpen, prefersReducedMotion]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (lightboxOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!lightboxOpen && dialog.open) {
      dialog.close();
    }
  }, [lightboxOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => setLightboxOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  if (!imageCount) {
    return null;
  }

  const frameClass =
    layout === "featured"
      ? "relative w-full lg:w-1/2 min-h-[16rem] aspect-[4/3] lg:aspect-auto lg:min-h-[20rem]"
      : "relative w-full aspect-[4/3] mt-2";

  const openLightbox = () => setLightboxOpen(true);

  return (
    <>
      <button
        type="button"
        className={`group ${frameClass} overflow-hidden rounded-[12px] bg-[var(--surface-muted)] shrink-0 cursor-zoom-in border-0 p-0 text-left`}
        onClick={openLightbox}
        aria-label={hasMultiple ? `Xem ${imageCount} ảnh dự án ${title}` : `Phóng to ảnh dự án ${title}`}
      >
        {images.map((image, index) => (
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt}
            fill
            sizes={layout === "featured" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
            className={`object-cover transition duration-700 ease-out group-hover:scale-[1.02] ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={index === 0}
          />
        ))}

        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-3 text-xs font-medium text-white">
          {hasMultiple ? (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <IconPhoto size={16} aria-hidden />
              {activeIndex + 1}/{imageCount} · Bấm xem album ảnh
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <IconPhoto size={16} aria-hidden />
              Bấm để phóng to
            </span>
          )}
        </span>

        {hasMultiple ? (
          <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
            Album ({imageCount} ảnh)
          </span>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        className="project-lightbox fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-black/75"
        aria-labelledby={dialogTitleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            setLightboxOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(activeIndex + 1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(activeIndex - 1);
          }
        }}
      >
        <div className="relative flex max-h-[min(90vh,56rem)] w-full max-w-5xl flex-col gap-4 rounded-[16px] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id={dialogTitleId} className="text-lg font-semibold text-[var(--ink)]">
                {title}
              </p>
              {images[activeIndex]?.caption ? (
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{images[activeIndex].caption}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--ink)] transition hover:bg-[var(--line)]"
              onClick={() => setLightboxOpen(false)}
              aria-label="Đóng album ảnh"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="relative min-h-[16rem] flex-1 overflow-hidden rounded-[12px] bg-[var(--surface-muted)] md:min-h-[24rem]">
            <Image
              src={images[activeIndex].url}
              alt={images[activeIndex].alt}
              fill
              sizes="(min-width: 1024px) 80vw, 100vw"
              className="object-contain"
              priority
            />

            {hasMultiple ? (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/70"
                  onClick={() => goTo(activeIndex - 1)}
                  aria-label="Ảnh trước"
                >
                  <IconChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/70"
                  onClick={() => goTo(activeIndex + 1)}
                  aria-label="Ảnh sau"
                >
                  <IconChevronRight size={22} />
                </button>
              </>
            ) : null}
          </div>

          {hasMultiple ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 transition ${
                    index === activeIndex ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => goTo(index)}
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-current={index === activeIndex}
                >
                  <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </dialog>
    </>
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
