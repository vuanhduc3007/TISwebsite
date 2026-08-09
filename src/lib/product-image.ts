const PRODUCT_UPLOAD_BASE = "/images/products/uploads/products";
const PRODUCT_FALLBACK_IMAGE = "/images/projects/hero_main.jpg";
const IMAGE_EXTENSION_OVERRIDES: Record<string, string> = {
  "phu_kien/5": ".png",
  "phu_kien/7": ".png",
  "phu_kien/12": ".png",
  "phu_kien/13": ".png",
  "phu_kien/27": ".png"
};

const LOCAL_IMAGE_PREFIXES = [
  "images/products/uploads/products/",
  "public/images/products/uploads/products/",
  "uploads/products/"
] as const;

function isUnsafeSegment(segment: string) {
  return segment === "." || segment === ".." || segment.includes("\0");
}

function resolveLocalExtension(segments: string[]) {
  const lastSegment = segments.at(-1) ?? "";
  if (/\.[a-z0-9]{2,5}$/i.test(lastSegment)) {
    return segments;
  }

  const extensionOverride = IMAGE_EXTENSION_OVERRIDES[segments.join("/")];
  return [...segments.slice(0, -1), `${lastSegment}${extensionOverride ?? ".jpg"}`];
}

export function toProductImageUrl(value: string | null | undefined) {
  const rawValue = value?.trim();
  if (!rawValue || /^https?:\/\//i.test(rawValue)) {
    return PRODUCT_FALLBACK_IMAGE;
  }

  const normalized = rawValue.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalized.startsWith("images/")) {
    const segments = normalized.split("/").filter(Boolean);
    return segments.some(isUnsafeSegment)
      ? PRODUCT_FALLBACK_IMAGE
      : `/${segments.map(encodeURIComponent).join("/")}`;
  }

  const relativePath = LOCAL_IMAGE_PREFIXES.reduce(
    (path, prefix) => (path.startsWith(prefix) ? path.slice(prefix.length) : path),
    normalized
  );
  const segments = relativePath.split("/").filter(Boolean);

  if (!segments.length || segments.some(isUnsafeSegment)) {
    return PRODUCT_FALLBACK_IMAGE;
  }

  const resolvedSegments = resolveLocalExtension(segments);
  return `${PRODUCT_UPLOAD_BASE}/${resolvedSegments.map(encodeURIComponent).join("/")}`;
}

export { PRODUCT_FALLBACK_IMAGE };
