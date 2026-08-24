const PROJECT_IMAGE_FALLBACK = "/images/projects/hero_main.jpg";

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

export { PROJECT_IMAGE_FALLBACK };
