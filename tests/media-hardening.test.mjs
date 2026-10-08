import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { storeImage, deleteStoredImage } from "../src/lib/admin/media.ts";

const fixtureEnv = { NODE_ENV: "production", MEDIA_PROVIDER: "cloudinary", MEDIA_STORAGE_PREFIX: "tiscms-e2e-test-mocked", CLOUDINARY_CLOUD_NAME: "fixture-cloud", CLOUDINARY_API_KEY: "fixture-key", CLOUDINARY_API_SECRET: "fixture-secret-not-for-production" };
async function fixture(fn) {
  const saved = Object.fromEntries(Object.keys(fixtureEnv).map(key => [key, process.env[key]]));
  Object.assign(process.env, fixtureEnv);
  const originalFetch = globalThis.fetch;
  const assets = new Set();
  const calls = [];
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  const state = { assets, calls, png, loseUploadResponse: false, failUpload: false, failDelete: false };
  globalThis.fetch = async (url, init) => {
    const operation = String(url).endsWith("/image/upload") ? "upload" : "destroy";
    assert.ok(String(url).startsWith("https://api.cloudinary.com/v1_1/fixture-cloud/"), "Unexpected fixture endpoint");
    calls.push(operation);
    const body = init.body;
    const publicId = body.get("public_id");
    if (operation === "upload") {
      assert.equal(body.get("overwrite"), "false");
      assert.match(publicId, /^tiscms-e2e-test-mocked\/(products|projects)\/[0-9]+-[a-f0-9]{24}$/);
      if (state.failUpload) return new Response("{}", { status: 401 });
      assert.ok(!assets.has(publicId), "Duplicate upload public ID");
      assets.add(publicId);
      if (state.loseUploadResponse) throw Error("Fixture response loss");
      return Response.json({ public_id: publicId, secure_url: `https://res.cloudinary.com/fixture-cloud/image/upload/${publicId}`, width: 2, height: 2, bytes: body.get("file").size });
    }
    if (state.failDelete) return new Response("{}", { status: 500 });
    return Response.json({ result: assets.delete(publicId) ? "ok" : "not found" });
  };
  try { await fn(state); } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

test("JPEG/PNG/WebP validation and server-owned IDs work with the patched sharp", async () => {
  await fixture(async state => {
    const images = [await sharp(state.png).jpeg().toBuffer(), state.png, await sharp(state.png).webp().toBuffer()];
    const types = ["image/jpeg", "image/png", "image/webp"];
    const keys = new Set();
    for (let i = 0; i < images.length; i++) {
      const media = await storeImage(new File([images[i]], "../../client-name.svg", { type: "text/plain" }), "products");
      assert.equal(media.mimeType, types[i]);
      assert.ok(!media.storageKey.includes("client-name"));
      keys.add(media.storageKey);
      await deleteStoredImage(media.storageKey);
      await deleteStoredImage(media.storageKey);
    }
    assert.equal(keys.size, 3);
    assert.equal(state.assets.size, 0);
  });
});

test("invalid/oversized images and out-of-namespace deletes never make a remote request", async () => {
  await fixture(async state => {
    await assert.rejects(storeImage(new File(["<svg></svg>"], "bad.png"), "products"));
    await assert.rejects(storeImage(new File([Buffer.alloc(8 * 1024 * 1024 + 1)], "large.png"), "products"));
    await assert.rejects(deleteStoredImage("tiscms-production/products/1-" + "a".repeat(24)));
    assert.equal(state.calls.length, 0);
  });
});

test("upload failure produces a generic error without disclosing credentials", async () => {
  await fixture(async state => {
    state.failUpload = true;
    await assert.rejects(storeImage(new File([state.png], "test.png"), "products"), error => !error.message.includes(fixtureEnv.CLOUDINARY_API_SECRET) && !error.message.includes(fixtureEnv.CLOUDINARY_API_KEY));
    assert.equal(state.assets.size, 0);
  });
});

test("ambiguous upload uses its known ID for immediate cleanup without duplicate upload", async () => {
  await fixture(async state => {
    state.loseUploadResponse = true;
    await assert.rejects(storeImage(new File([state.png], "test.png"), "products"));
    assert.deepEqual(state.calls, ["upload", "destroy"]);
    assert.equal(state.assets.size, 0);
  });
});

test("failed remote delete leaves an identifiable orphan that a later cleanup can remove", async () => {
  await fixture(async state => {
    const media = await storeImage(new File([state.png], "test.png"), "projects");
    state.failDelete = true;
    await assert.rejects(deleteStoredImage(media.storageKey));
    assert.ok(state.assets.has(media.storageKey));
    state.failDelete = false;
    await deleteStoredImage(media.storageKey);
    assert.equal(state.assets.size, 0);
  });
});
