import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

export type StoredMedia = {
  url: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
};

function validateDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
    throw new Error("Kích thước ảnh không hợp lệ hoặc quá lớn.");
  }
  return { width, height };
}

function readWebpDimensions(buffer: Buffer) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.subarray(offset, offset + 4).toString("ascii");
    const length = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + length > buffer.length) break;
    if (chunk === "VP8X" && length >= 10) {
      return validateDimensions(1 + buffer.readUIntLE(data + 4, 3), 1 + buffer.readUIntLE(data + 7, 3));
    }
    if (chunk === "VP8L" && length >= 5 && buffer[data] === 0x2f) {
      const width = 1 + (((buffer[data + 2] & 0x3f) << 8) | buffer[data + 1]);
      const height = 1 + (((buffer[data + 4] & 0x0f) << 10) | (buffer[data + 3] << 2) | (buffer[data + 2] >> 6));
      return validateDimensions(width, height);
    }
    if (chunk === "VP8 " && length >= 10 && buffer.subarray(data + 3, data + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return validateDimensions(buffer.readUInt16LE(data + 6) & 0x3fff, buffer.readUInt16LE(data + 8) & 0x3fff);
    }
    offset = data + length + (length % 2);
  }
  throw new Error("Ảnh WebP không hợp lệ.");
}

function readImageMetadata(buffer: Buffer) {
  if (buffer.length >= 33
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && buffer.readUInt32BE(8) === 13
    && buffer.subarray(12, 16).toString("ascii") === "IHDR"
    && buffer.subarray(buffer.length - 8, buffer.length - 4).toString("ascii") === "IEND") {
    return { mimeType: "image/png", ...validateDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20)) };
  }
  if (buffer.length >= 20 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP" && buffer.readUInt32LE(4) + 8 <= buffer.length) {
    return { mimeType: "image/webp", ...readWebpDimensions(buffer) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mimeType: "image/jpeg", ...validateDimensions(buffer.readUInt16BE(offset + 7), buffer.readUInt16BE(offset + 5)) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
    throw new Error("Ảnh JPEG không hợp lệ.");
  }
  throw new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ.");
}

function safeFolder(folder: string) {
  if (!/^[a-z0-9/_-]+$/.test(folder) || folder.includes("..")) throw new Error("Thư mục upload không hợp lệ.");
  return folder.replace(/^\/+|\/+$/g, "");
}

function storageFolder(resourceFolder: string) {
  if (resourceFolder !== "products" && resourceFolder !== "projects") throw new Error("Nhóm ảnh không hợp lệ.");
  const configuredPrefix = process.env.MEDIA_STORAGE_PREFIX?.trim();
  if (process.env.NODE_ENV === "production" && !configuredPrefix) throw new Error("MEDIA_STORAGE_PREFIX chưa được cấu hình.");
  const prefix = configuredPrefix ? safeFolder(configuredPrefix) : "";
  return prefix ? `${prefix}/${resourceFolder}` : resourceFolder;
}

function isOwnedStorageKey(storageKey: string, includeExtension: boolean) {
  const configuredPrefix = process.env.MEDIA_STORAGE_PREFIX?.trim();
  const prefix = configuredPrefix ? `${safeFolder(configuredPrefix)}/` : "";
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const extension = includeExtension ? "\\.(jpg|png|webp)" : "";
  return new RegExp(`^${escapedPrefix}(products|projects)/[0-9]+-[a-f0-9]{24}${extension}$`).test(storageKey);
}

export async function storeImage(file: File, folder: string): Promise<StoredMedia | null> {
  if (!file.size) return null;
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh không được vượt quá 8 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("Ảnh không được vượt quá 8 MB.");
  const metadata = readImageMetadata(buffer);
  if (!ALLOWED_TYPES.has(metadata.mimeType)) throw new Error("Định dạng ảnh không được hỗ trợ.");
  const extension = ALLOWED_TYPES.get(metadata.mimeType)!;
  const cleanFolder = storageFolder(folder);
  const key = `${cleanFolder}/${Date.now()}-${randomBytes(12).toString("hex")}${extension}`;
  const provider = process.env.MEDIA_PROVIDER ?? (process.env.NODE_ENV === "production" ? "cloudinary" : "local");

  if (provider === "cloudinary") {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary chưa được cấu hình.");
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = key.replace(/\.[^.]+$/, "");
    const signature = createHash("sha1").update(`overwrite=false&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
    const body = new FormData();
    body.set("file", new Blob([buffer], { type: metadata.mimeType }), path.basename(key));
    body.set("api_key", apiKey);
    body.set("timestamp", String(timestamp));
    body.set("public_id", publicId);
    body.set("overwrite", "false");
    body.set("signature", signature);
    let response: Response;
    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body, signal: AbortSignal.timeout(30_000) });
    } catch {
      // The public ID is known before sending. A best-effort destroy handles
      // most ambiguous timeouts; the reconciliation script covers the race
      // where Cloudinary finishes after this immediate cleanup attempt.
      await deleteStoredImage(publicId).catch(() => undefined);
      throw new Error("Không thể upload ảnh lên Cloudinary.");
    }
    if (!response.ok) throw new Error("Không thể upload ảnh lên Cloudinary.");
    try {
      const result = (await response.json()) as { secure_url: string; public_id: string; width?: number; height?: number; bytes?: number; format?: string };
      const resultUrl = new URL(result.secure_url);
      const cloudDimensions = validateDimensions(Number(result.width), Number(result.height));
      if (result.public_id !== publicId || resultUrl.protocol !== "https:" || resultUrl.hostname !== "res.cloudinary.com"
        || !resultUrl.pathname.startsWith(`/${cloudName}/image/upload/`) || !Number.isSafeInteger(result.bytes) || Number(result.bytes) > MAX_IMAGE_BYTES) {
        throw new Error("Phản hồi upload Cloudinary không hợp lệ.");
      }
      return { url: resultUrl.toString(), storageKey: result.public_id, mimeType: metadata.mimeType, fileSize: Number(result.bytes), ...cloudDimensions };
    } catch (error) {
      await deleteStoredImage(publicId).catch(() => undefined);
      throw error;
    }
  }

  if (provider !== "local" || process.env.NODE_ENV === "production") throw new Error("MEDIA_PROVIDER không hợp lệ cho production.");
  const base = path.resolve(process.cwd(), "public", "images", "admin-uploads");
  const target = path.resolve(base, key);
  if (!target.startsWith(`${base}${path.sep}`)) throw new Error("Đường dẫn upload không hợp lệ.");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return { url: `/images/admin-uploads/${key.replaceAll("\\", "/")}`, storageKey: `local:${key}`, mimeType: metadata.mimeType, fileSize: buffer.length, width: metadata.width, height: metadata.height };
}

export async function deleteStoredImage(storageKey: string | null | undefined) {
  if (!storageKey) return;
  if (storageKey.startsWith("local:")) {
    if (process.env.NODE_ENV === "production") return;
    const relative = storageKey.slice(6);
    if (!isOwnedStorageKey(relative, true)) throw new Error("Khóa ảnh local không hợp lệ.");
    const base = path.resolve(process.cwd(), "public", "images", "admin-uploads");
    const target = path.resolve(base, relative);
    if (!target.startsWith(`${base}${path.sep}`)) throw new Error("Đường dẫn xóa ảnh không hợp lệ.");
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  if (!isOwnedStorageKey(storageKey, false)) throw new Error("Khóa ảnh Cloudinary không hợp lệ.");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary chưa được cấu hình để xóa ảnh.");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`invalidate=true&public_id=${storageKey}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id: storageKey, timestamp: String(timestamp), invalidate: "true", api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, { method: "POST", body, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("Không thể xóa ảnh khỏi Cloudinary.");
  const result = (await response.json()) as { result?: string };
  if (result.result !== "ok" && result.result !== "not found") throw new Error("Cloudinary không xác nhận xóa ảnh.");
}
