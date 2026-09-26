import fs from "node:fs/promises";
import path from "node:path";
import { loadCloudinaryTestEnv } from "./admin-db-utils.mjs";

loadCloudinaryTestEnv();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const prefix = process.env.MEDIA_STORAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary TEST/STAGING credentials are required.");
if (!prefix?.startsWith("tiscms-e2e-test")) throw new Error("MEDIA_STORAGE_PREFIX must start with tiscms-e2e-test for this destructive E2E cleanup test.");
if (process.env.MEDIA_PROVIDER !== "cloudinary") throw new Error("MEDIA_PROVIDER must be cloudinary.");

const { deleteStoredImage, storeImage } = await import("../src/lib/admin/media.ts");
const authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
const tracked = new Set();
const results = {};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (init?.method === "POST" && String(input).includes("/image/upload")) {
    const body = init?.body;
    assert(body instanceof FormData && body.get("overwrite") === "false", "Upload did not set overwrite=false.");
    assert(String(body.get("public_id") ?? "").startsWith(`${prefix}/`), "Upload public ID escaped the test namespace.");
    assert(!String(body.get("public_id")).includes("client-name"), "Client filename affected public ID.");
  }
  return originalFetch(input, init);
};

async function listNamespace() {
  const ids = [];
  let cursor;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload`);
    url.searchParams.set("prefix", `${prefix}/`);
    url.searchParams.set("max_results", "500");
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const response = await fetch(url, { headers: { authorization }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Cloudinary inventory failed with HTTP ${response.status}.`);
    const body = await response.json();
    ids.push(...body.resources.map((item) => String(item.public_id)));
    cursor = typeof body.next_cursor === "string" ? body.next_cursor : undefined;
  } while (cursor);
  return new Set(ids);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fixtureFiles() {
  const jpeg = await fs.readFile(path.resolve(process.cwd(), "public", "images", "projects", "cho-kim-tan-exterior-01.jpg"));
  const png = await fs.readFile(path.resolve(process.cwd(), "public", "brand", "tis-logo.png"));
  const { default: sharp } = await import("sharp");
  const webp = await sharp(png).webp().toBuffer();
  return [
    new File([jpeg], "../../client-name.jpg", { type: "text/plain" }),
    new File([png], "..\\client-name.png", { type: "application/octet-stream" }),
    new File([webp], "client-name.webp", { type: "image/jpeg" })
  ];
}

async function cleanTracked() {
  const failures = [];
  for (const key of tracked) {
    try { await deleteStoredImage(key); } catch (error) { failures.push({ key, error: error instanceof Error ? error.message : "unknown" }); }
  }
  tracked.clear();
  if (failures.length) throw new Error(`Cleanup failed for ${failures.length} asset(s).`);
}

const baseline = await listNamespace();
try {
  const fixtures = await fixtureFiles();
  const uploaded = [];
  for (const file of fixtures) {
    const media = await storeImage(file, "products");
    assert(media, "Expected uploaded media metadata.");
    assert(media.storageKey.startsWith(`${prefix}/products/`), "Server-controlled public ID prefix was not applied.");
    assert(media.url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`), "Unexpected Cloudinary delivery URL.");
    tracked.add(media.storageKey);
    uploaded.push(media);
  }
  const inventoryAfterUpload = await listNamespace();
  for (const media of uploaded) assert(inventoryAfterUpload.has(media.storageKey), `Uploaded asset is missing: ${media.storageKey}`);
  results.upload = { pass: true, formats: uploaded.map((item) => item.mimeType) };

  for (const media of uploaded) {
    await deleteStoredImage(media.storageKey);
    await deleteStoredImage(media.storageKey);
    tracked.delete(media.storageKey);
  }
  const inventoryAfterDelete = await listNamespace();
  for (const media of uploaded) assert(!inventoryAfterDelete.has(media.storageKey), `Deleted asset still exists: ${media.storageKey}`);
  results.delete = { pass: true, repeatedDelete: true };

  let arbitraryDeleteRejected = false;
  try { await deleteStoredImage(`outside/${Date.now()}-${"a".repeat(24)}`); } catch { arbitraryDeleteRejected = true; }
  assert(arbitraryDeleteRejected, "Out-of-namespace delete was not rejected.");
  results.namespaceIsolation = { pass: true };

  const originalApiKey = process.env.CLOUDINARY_API_KEY;
  process.env.CLOUDINARY_API_KEY = "invalid-test-key";
  try {
    let failed = false;
    try { await storeImage(fixtures[1], "products"); } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      assert(!message.includes(apiSecret), "Upload error leaked the API secret.");
    }
    assert(failed, "Invalid Cloudinary credentials unexpectedly uploaded an asset.");
  } finally {
    process.env.CLOUDINARY_API_KEY = originalApiKey;
  }
  results.uploadFailure = { pass: true, secretLeak: false };

  const beforeAmbiguous = await listNamespace();
  const instrumentedFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await instrumentedFetch(input, init);
    if (String(input).includes("/image/upload")) throw new Error("simulated response loss after remote completion");
    return response;
  };
  try {
    let failed = false;
    try { await storeImage(fixtures[1], "products"); } catch { failed = true; }
    assert(failed, "Ambiguous upload simulation did not fail locally.");
  } finally {
    globalThis.fetch = instrumentedFetch;
  }
  const afterAmbiguous = await listNamespace();
  const ambiguousOrphans = [...afterAmbiguous].filter((id) => !beforeAmbiguous.has(id));
  for (const key of ambiguousOrphans) tracked.add(key);
  assert(ambiguousOrphans.length === 0, `Ambiguous upload left ${ambiguousOrphans.length} orphan(s).`);
  results.ambiguousUpload = { pass: true, immediateCleanup: true, reconciliationStillRequiredForNetworkRace: true };

  const beforeBatch = await listNamespace();
  const batchUploaded = [];
  let expectedBatchFailure = false;
  try {
    for (const file of fixtures.slice(0, 2)) {
      const media = await storeImage(file, "projects");
      assert(media, "Expected batch upload metadata.");
      tracked.add(media.storageKey);
      batchUploaded.push(media);
    }
    await storeImage(new File([Buffer.from("not-an-image")], "bad.jpg", { type: "image/jpeg" }), "projects");
  } catch (error) {
    expectedBatchFailure = error instanceof Error && error.message.includes("JPEG");
  } finally {
    for (const media of batchUploaded) {
      await deleteStoredImage(media.storageKey);
      tracked.delete(media.storageKey);
    }
  }
  assert(expectedBatchFailure, "Invalid batch image did not fail validation as expected.");
  const afterBatch = await listNamespace();
  const batchOrphans = [...afterBatch].filter((id) => !beforeBatch.has(id));
  for (const key of batchOrphans) tracked.add(key);
  assert(batchOrphans.length === 0, `Batch rollback left ${batchOrphans.length} orphan(s).`);
  results.batchRollback = { pass: true };
} finally {
  await cleanTracked();
  globalThis.fetch = originalFetch;
}

const finalInventory = await listNamespace();
const leftovers = [...finalInventory].filter((id) => !baseline.has(id));
assert(leftovers.length === 0, `Test cleanup left ${leftovers.length} asset(s).`);
results.cleanup = { pass: true, namespaceAssetsBefore: baseline.size, namespaceAssetsAfter: finalInventory.size };
console.log(JSON.stringify(results, null, 2));
