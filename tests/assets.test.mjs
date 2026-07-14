import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const runtimeDirectory = new URL("../public/assets/fog-harbor/", import.meta.url);
const sourceDirectory = new URL("../design-assets/source/", import.meta.url);

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

test("keeps production assets WebP-only and preserves verified PNG sources", async () => {
  const runtimeManifest = JSON.parse(
    await readFile(new URL("ASSET_MANIFEST.json", runtimeDirectory), "utf8"),
  );
  const sourceManifest = JSON.parse(
    await readFile(new URL("ASSET_MANIFEST.source.json", sourceDirectory), "utf8"),
  );
  const runtimeFiles = await readdir(runtimeDirectory);
  const sourceFiles = await readdir(sourceDirectory);
  const runtimeWebp = runtimeFiles.filter((name) => name.endsWith(".webp"));
  const runtimePng = runtimeFiles.filter((name) => name.endsWith(".png"));
  const sourcePng = sourceFiles.filter((name) => name.endsWith(".png"));

  assert.equal(runtimeManifest.length, 10);
  assert.equal(sourceManifest.schemaVersion, 1);
  assert.equal(sourceManifest.sourceRoot, "design-assets/source");
  assert.equal(sourceManifest.assets.length, 10);
  assert.equal(runtimeWebp.length, 10);
  assert.equal(runtimePng.length, 0, "source PNG files must never ship from public/");
  assert.equal(sourcePng.length, 10);

  const runtimeIds = runtimeManifest.map((asset) => asset.id).sort();
  const sourceIds = sourceManifest.assets.map((asset) => asset.id).sort();
  assert.deepEqual(runtimeIds, sourceIds);

  for (const asset of runtimeManifest) {
    assert.equal("png" in asset, false);
    assert.equal("sha256_png" in asset, false);
    assert.match(asset.webp, /^\/assets\/fog-harbor\/[a-z0-9-]+\.webp$/);
    assert.ok(Number.isInteger(asset.width) && asset.width > 0);
    assert.ok(Number.isInteger(asset.height) && asset.height > 0);
    assert.ok(runtimeWebp.includes(asset.webp.split("/").at(-1)));
    assert.ok((await stat(new URL(`../public${asset.webp}`, import.meta.url))).size > 0);
  }

  for (const asset of sourceManifest.assets) {
    assert.match(asset.file, /^[a-z0-9-]+\.png$/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(sourcePng.includes(asset.file));
    assert.equal(await sha256(new URL(asset.file, sourceDirectory)), asset.sha256);
  }
});
