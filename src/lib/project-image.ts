import type { ProjectImage, ProjectPillar } from "@/lib/projects-contract";

const PROJECT_IMAGE_FALLBACK = "/images/projects/hero_main.jpg";

/** Ảnh mặc định theo lĩnh vực khi dự án chưa có album trong `project_images`. */
export const PROJECT_PLACEHOLDER_BY_PILLAR: Record<ProjectPillar, string> = {
  it: "/images/projects/hero_main.jpg",
  me: "/images/projects/electrical-panel-installation.jpg",
  renewable: "/images/projects/cho-kim-tan-rooftop-panels-01.jpg"
};

function isUnsafeSegment(segment: string) {
  return segment === "." || segment === ".." || segment.includes("\0");
}

export function toProjectImageUrl(value: string | null | undefined) {
  const rawValue = value?.trim();
  if (!rawValue) {
    return PROJECT_IMAGE_FALLBACK;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  const normalized = rawValue.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (!segments.length || segments.some(isUnsafeSegment)) {
    return PROJECT_IMAGE_FALLBACK;
  }

  const path = segments[0] === "images" ? segments.join("/") : `images/projects/${segments.join("/")}`;
  return `/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function getProjectPlaceholderUrl(pillar: ProjectPillar) {
  return PROJECT_PLACEHOLDER_BY_PILLAR[pillar] ?? PROJECT_IMAGE_FALLBACK;
}

export function createPlaceholderProjectImage(pillar: ProjectPillar, projectName: string): ProjectImage {
  return {
    id: 0,
    url: getProjectPlaceholderUrl(pillar),
    alt: projectName,
    caption: "Ảnh minh họa dự án"
  };
}

/** Luôn trả về ít nhất 1 ảnh để UI không bị trống. */
export function resolveProjectImages(
  images: ProjectImage[] | null | undefined,
  pillar: ProjectPillar,
  projectName: string
) {
  if (images?.length) {
    return images;
  }

  return [createPlaceholderProjectImage(pillar, projectName)];
}

export { PROJECT_IMAGE_FALLBACK };
