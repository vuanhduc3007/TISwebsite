import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { getDatabaseConfig, loadCloudinaryTestEnv } from "./admin-db-utils.mjs";

loadCloudinaryTestEnv();
const config = getDatabaseConfig();
if (config.database !== "solar_shop_admin_test") throw new Error("Refusing database mutation outside the test database.");

const { deleteStoredImage, storeImage } = await import("../src/lib/admin/media.ts");
const png = await fs.readFile(path.resolve(process.cwd(), "public", "brand", "tis-logo.png"));
const file = () => new File([png], "client-controlled.png", { type: "image/png" });
const connection = await mysql.createConnection(config);
let transactionOpen = false;
let projectId = null;
let orphanStorageKey = null;
const uploadedKeys = [];
const result = {};

async function countRows() {
  const [rows] = await connection.query(`SELECT
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM project_images) AS images`);
  return { projects: Number(rows[0].projects), images: Number(rows[0].images) };
}

async function cleanupKey(key) {
  try { await deleteStoredImage(key); } catch (error) {
    console.error("[test media cleanup]", { key, error: error instanceof Error ? error.message : "unknown" });
    throw error;
  }
}

try {
  const [dbRows] = await connection.query("SELECT DATABASE() AS database_name");
  if (dbRows[0]?.database_name !== "solar_shop_admin_test") throw new Error("Connected to an unexpected database.");
  const before = await countRows();

  const originalApiKey = process.env.CLOUDINARY_API_KEY;
  process.env.CLOUDINARY_API_KEY = "invalid-test-key";
  try {
    let rejected = false;
    try { await storeImage(file(), "projects"); } catch (error) {
      rejected = true;
      if (String(error).includes(process.env.CLOUDINARY_API_SECRET)) throw new Error("Upload failure leaked the API secret.");
    }
    if (!rejected) throw new Error("Invalid credential upload succeeded unexpectedly.");
  } finally {
    process.env.CLOUDINARY_API_KEY = originalApiKey;
  }
  const afterFailure = await countRows();
  if (afterFailure.projects !== before.projects || afterFailure.images !== before.images) throw new Error("Upload failure changed DB rows.");
  result.uploadFailureDb = { pass: true };

  await connection.beginTransaction();
  transactionOpen = true;
  const [created] = await connection.execute(`INSERT INTO projects
    (name, client, pillar, contract_value_vnd, is_highlight, sort_order, status)
    VALUES (?, ?, 'renewable', 0, 0, 0, 'draft')`, ["__cloudinary_e2e_batch__", "test"]);
  const batchProjectId = created.insertId;
  let expectedFailure = false;
  try {
    for (let i = 0; i < 2; i += 1) {
      const media = await storeImage(file(), "projects");
      if (!media) throw new Error("Expected uploaded media metadata.");
      uploadedKeys.push(media.storageKey);
      await connection.execute(`INSERT INTO project_images
        (project_id, image_url, storage_key, mime_type, file_size, width, height, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [batchProjectId, media.url, media.storageKey, media.mimeType, media.fileSize, media.width, media.height, i]);
    }
    await storeImage(new File([Buffer.from("invalid")], "bad.png", { type: "image/png" }), "projects");
  } catch (error) {
    expectedFailure = error instanceof Error && error.message.includes("hợp lệ");
  }
  if (!expectedFailure) throw new Error("Batch failure was not triggered.");
  await connection.rollback();
  transactionOpen = false;
  for (const key of uploadedKeys) await cleanupKey(key);
  uploadedKeys.length = 0;
  const afterBatch = await countRows();
  if (afterBatch.projects !== before.projects || afterBatch.images !== before.images) throw new Error("Batch rollback left partial DB rows.");
  result.batchRollbackDb = { pass: true };

  const media = await storeImage(file(), "projects");
  if (!media) throw new Error("Expected media for remote delete failure test.");
  orphanStorageKey = media.storageKey;
  await connection.beginTransaction();
  transactionOpen = true;
  const [project] = await connection.execute(`INSERT INTO projects
    (name, client, pillar, contract_value_vnd, is_highlight, sort_order, status)
    VALUES (?, ?, 'renewable', 0, 0, 0, 'draft')`, ["__cloudinary_e2e_delete__", "test"]);
  projectId = project.insertId;
  await connection.execute(`INSERT INTO project_images
    (project_id, image_url, storage_key, mime_type, file_size, width, height, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
  [projectId, media.url, media.storageKey, media.mimeType, media.fileSize, media.width, media.height]);
  await connection.commit();
  transactionOpen = false;

  await connection.beginTransaction();
  transactionOpen = true;
  await connection.execute("DELETE FROM projects WHERE id=?", [projectId]);
  await connection.commit();
  transactionOpen = false;
  projectId = null;
  process.env.CLOUDINARY_API_KEY = "invalid-test-key";
  let deleteRejected = false;
  try { await deleteStoredImage(orphanStorageKey); } catch { deleteRejected = true; }
  finally { process.env.CLOUDINARY_API_KEY = originalApiKey; }
  if (!deleteRejected) throw new Error("Invalid credential remote deletion unexpectedly succeeded.");
  const afterDeleteFailure = await countRows();
  if (afterDeleteFailure.projects !== before.projects || afterDeleteFailure.images !== before.images) {
    throw new Error("Remote delete failure changed committed DB state.");
  }
  result.deleteFailureDb = { pass: true, orphanStorageKey };
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (transactionOpen) await connection.rollback().catch(() => undefined);
  if (projectId !== null) await connection.execute("DELETE FROM projects WHERE id=?", [projectId]).catch(() => undefined);
  for (const key of uploadedKeys) await cleanupKey(key);
  await connection.end();
}
