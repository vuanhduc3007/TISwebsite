import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadCloudinaryTestEnv } from "./admin-db-utils.mjs";

loadCloudinaryTestEnv();
const secret = Buffer.from(process.env.CLOUDINARY_API_SECRET);
const staticDirectory = path.resolve(process.cwd(), ".next", "static");
const files = await readdir(staticDirectory, { recursive: true, withFileTypes: true });
let scannedFiles = 0;
for (const file of files) {
  if (!file.isFile()) continue;
  scannedFiles += 1;
  const bytes = await readFile(path.join(file.parentPath, file.name));
  if (bytes.includes(secret)) throw new Error("Cloudinary API secret was found in the client build.");
}
console.log(JSON.stringify({ scannedFiles, cloudinaryApiSecretInClient: false }));
