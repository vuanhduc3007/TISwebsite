import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { getDatabaseConfig, loadCloudinaryTestEnv, loadEnvLocal } from "./admin-db-utils.mjs";

if (process.argv.includes("--test-env")) loadCloudinaryTestEnv();
else loadEnvLocal();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const prefix = process.env.MEDIA_STORAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary credentials are incomplete.");
if (!prefix || !/^[a-z0-9/_-]+$/.test(prefix) || prefix.includes("..")) throw new Error("MEDIA_STORAGE_PREFIX is required and invalid.");

const requestedAge = Number(process.env.MEDIA_RECONCILE_MIN_AGE_MINUTES ?? 60);
const testNamespace = prefix.startsWith("tiscms-e2e-test");
const minimumAgeMinutes = testNamespace ? Math.max(0, requestedAge) : Math.max(15, requestedAge);
if (!Number.isFinite(minimumAgeMinutes)) throw new Error("MEDIA_RECONCILE_MIN_AGE_MINUTES is invalid.");
const deleteMode = process.argv.includes("--delete");
if (deleteMode && process.env.CONFIRM_MEDIA_RECONCILE !== prefix) {
  throw new Error("Refusing deletion: CONFIRM_MEDIA_RECONCILE must exactly equal MEDIA_STORAGE_PREFIX.");
}

const authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
const namespacePattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\/(products|projects)\/[0-9]+-[a-f0-9]{24}$`);

async function listAssets() {
  const assets = [];
  let cursor;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload`);
    url.searchParams.set("prefix", `${prefix}/`);
    url.searchParams.set("max_results", "500");
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const response = await fetch(url, { headers: { authorization }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Cloudinary inventory failed with HTTP ${response.status}.`);
    const body = await response.json();
    if (!Array.isArray(body.resources)) throw new Error("Cloudinary inventory response is invalid.");
    assets.push(...body.resources.map((item) => ({ publicId: String(item.public_id ?? ""), createdAt: String(item.created_at ?? "") })));
    cursor = typeof body.next_cursor === "string" ? body.next_cursor : undefined;
  } while (cursor);
  return assets;
}

async function destroyAsset(publicId) {
  if (!namespacePattern.test(publicId)) throw new Error(`Refusing out-of-namespace asset: ${publicId}`);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: "true", api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, { method: "POST", body, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Cloudinary delete failed with HTTP ${response.status}.`);
  const result = await response.json();
  if (result.result !== "ok" && result.result !== "not found") throw new Error(`Cloudinary delete was not confirmed for ${publicId}.`);
}

const connection = await mysql.createConnection(getDatabaseConfig());
try {
  const [rows] = await connection.query(`
    SELECT image_storage_key AS storage_key FROM products WHERE image_storage_key IS NOT NULL
    UNION
    SELECT storage_key FROM project_images WHERE storage_key IS NOT NULL
  `);
  const referenced = new Set(rows.map((row) => String(row.storage_key)));
  const cutoff = Date.now() - minimumAgeMinutes * 60_000;
  const assets = await listAssets();
  const orphaned = assets.filter((asset) => namespacePattern.test(asset.publicId)
    && !referenced.has(asset.publicId)
    && Number.isFinite(Date.parse(asset.createdAt))
    && Date.parse(asset.createdAt) <= cutoff);

  console.log(JSON.stringify({ mode: deleteMode ? "delete" : "dry-run", prefix, minimumAgeMinutes, scanned: assets.length, referenced: referenced.size, orphaned: orphaned.map((asset) => asset.publicId) }, null, 2));
  if (deleteMode) {
    for (const asset of orphaned) await destroyAsset(asset.publicId);
    console.log(`Deleted ${orphaned.length} unreferenced Cloudinary asset(s).`);
  }
} finally {
  await connection.end();
}
