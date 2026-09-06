import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root, configFile: false, appType: "custom", logLevel: "silent", server: { middlewareMode: true }, resolve: { alias: { "@": root } } });
after(() => server.close());
const { createSaveStorage } = await server.ssrLoadModule("/lib/save-storage.ts");
const { encodeSaveFile, decodeSaveFile } = await server.ssrLoadModule("/lib/save-file.ts");
const envelope = (code) => JSON.stringify({ version: 1, state: { investigatorCode: code } });
function backend(entries = []) {
  const values = new Map(entries);
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("blocked storage preserves a playable in-memory investigation", () => {
  const saved = createSaveStorage(() => { throw new Error("SecurityError"); });
  assert.equal(saved.storage.getItem("new"), null);
  saved.storage.setItem("new", envelope("SAFE"));
  assert.equal(saved.storage.getItem("new"), envelope("SAFE"));
  assert.equal(saved.getStatus(), "unavailable");
});

test("quota failure never rolls the current session back to an older snapshot", () => {
  const disk = backend([["new", envelope("OLD")]]);
  const saved = createSaveStorage(() => disk);
  assert.equal(saved.storage.getItem("new"), envelope("OLD"));
  disk.setItem = () => { throw new Error("QuotaExceededError"); };
  saved.storage.setItem("new", envelope("LATEST"));
  assert.equal(saved.storage.getItem("new"), envelope("LATEST"));
  assert.equal(disk.values.get("new"), envelope("OLD"));
});

for (const key of ["new", "old"]) {
  test(`a transient read failure cannot overwrite or obscure the existing ${key} save`, () => {
    const disk = backend([[key, envelope("ORIGINAL")]]);
    const saved = createSaveStorage(() => disk, "old");
    const read = disk.getItem;
    disk.getItem = () => { disk.getItem = read; throw new Error("Transient read error"); };
    assert.equal(saved.storage.getItem("new"), null);
    saved.storage.setItem("new", envelope("TEMPORARY"));
    assert.equal(saved.storage.getItem("new"), envelope("TEMPORARY"));
    assert.equal(saved.getStatus(), "unavailable");
    assert.equal(disk.values.get(key), envelope("ORIGINAL"));
    if (key === "old") assert.equal(disk.values.has("new"), false);
    assert.equal(createSaveStorage(() => disk, "old").storage.getItem("new"), envelope("ORIGINAL"));
  });
}

test("v1 migration is copy-on-write and an existing v3 snapshot wins", () => {
  const disk = backend([["old", envelope("LEGACY")]]);
  const saved = createSaveStorage(() => disk, "old");
  assert.equal(saved.storage.getItem("new"), envelope("LEGACY"));
  saved.storage.setItem("new", envelope("V3"));
  assert.equal(disk.values.get("old"), envelope("LEGACY"));
  assert.equal(createSaveStorage(() => disk, "old").storage.getItem("new"), envelope("V3"));
});

test("corrupt data is quarantined before replacement", () => {
  const disk = backend([["new", "{broken"]]);
  const saved = createSaveStorage(() => disk);
  assert.equal(saved.storage.getItem("new"), null);
  assert.equal(saved.getStatus(), "recovered");
  saved.storage.setItem("new", envelope("RECOVERED"));
  assert.equal(disk.values.get("new-recovery"), "{broken");
  assert.equal(saved.getRecovery(), "{broken");
  const reopened = createSaveStorage(() => disk);
  reopened.storage.getItem("new");
  assert.equal(reopened.getRecovery(), "{broken");
});

test("unrecoverable storage preserves the sole corrupt original", () => {
  const disk = backend([["new", "{broken"]]);
  disk.setItem = () => { throw new Error("QuotaExceededError"); };
  const saved = createSaveStorage(() => disk);
  assert.equal(saved.storage.getItem("new"), null);
  saved.storage.setItem("new", envelope("TEMP"));
  assert.equal(saved.storage.getItem("new"), envelope("TEMP"));
  saved.storage.removeItem("new");
  assert.equal(disk.values.get("new"), "{broken");
});

test("backup format rejects unrelated, truncated, oversized and future files", () => {
  const state = { investigatorCode: "QA", runCount: 2, completedPuzzles: ["schedule"], caseNote: "保留原文" };
  assert.deepEqual(decodeSaveFile(encodeSaveFile(state)), state);
  for (const text of ["{", "[]", "{}", JSON.stringify({ format: "fog-harbor-archive", schemaVersion: 999, state }), encodeSaveFile({ ...state, completedPuzzles: ["invented"] }), " ".repeat(5 * 1024 * 1024 + 1)]) {
    assert.throws(() => decodeSaveFile(text));
  }
});
