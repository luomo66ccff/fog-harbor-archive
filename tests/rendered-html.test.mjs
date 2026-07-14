import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished fog harbor archive shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /雾港档案/);
  assert.match(html, /失踪的第七码头|读取潮湿的纸张/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|codex-preview/);
});

test("ships the complete playable investigation structure", async () => {
  const [page, layout, caseData, evidenceData, puzzleEngine, store, packageJson, css, responsiveCss] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/case-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/evidence-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/puzzle-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../store/case-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/responsive.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<GameClient \/>/);
  assert.match(layout, /title: "雾港档案：失踪的第七码头"/);
  assert.match(store, /fog-harbor-save-v1/);
  assert.match(store, /completePuzzle/);
  assert.match(store, /merge:\s*\(persistedState, currentState\)[\s\S]*sanitizePersistedCaseState\(persistedState/);
  assert.match(packageJson, /"framer-motion"/);
  assert.match(packageJson, /"zustand"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page + layout, /_sites-preview|codex-preview|Starter Project/);

  assert.ok((caseData.match(/^\s*id: "doc-/gm) ?? []).length >= 9, "at least nine archive documents");
  assert.ok((caseData.match(/^\s*id: "msg-/gm) ?? []).length >= 6, "at least six messages");
  assert.ok((caseData.match(/^\s*id: "audio-/gm) ?? []).length >= 3, "at least three audio records");
  assert.ok((evidenceData.match(/^\s*\{ id: "ev-/gm) ?? []).length >= 21, "at least twenty-one evidence records");
  for (const name of ["林知夏", "周既明", "顾惟安", "许晚澄", "陈牧", "唐芷", "叶澜"]) assert.match(caseData, new RegExp(name));
  for (const answer of ["11", "0712", "H-1707", "TIDE7"]) assert.match(caseData + evidenceData + puzzleEngine + store, new RegExp(answer));
  assert.match(css + responsiveCss, /prefers-reduced-motion/);
  assert.doesNotMatch(css + responsiveCss, /gradient\s*\(/i, "visual system must not use CSS gradients");

  for (const path of ["SchedulePuzzle.tsx", "FrequencyPuzzle.tsx", "PhotoPuzzle.tsx", "DeductionPuzzle.tsx", "HiddenPuzzle.tsx"]) {
    await access(new URL(`../components/puzzles/${path}`, import.meta.url));
  }
});

test("sanitizes structurally corrupt persisted case fields before merging", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const server = await createServer({
    root,
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
    resolve: { alias: { "@": root } },
  });

  try {
    const { sanitizePersistedCaseState } = await server.ssrLoadModule("/store/case-store.ts");
    const fallback = {
      investigatorCode: "",
      bootSeen: false,
      runCount: 1,
      completedRuns: 0,
      completedPuzzles: [],
      unlockedEvidenceIds: ["ev-commission"],
      readDocumentIds: [],
      readMessageIds: [],
      readEvidenceIds: [],
      evidenceVerdicts: {},
      evidenceNotes: {},
      caseNote: "",
      discoveredAnonymous: false,
      currentEnding: null,
      endingsSeen: [],
      puzzleAttempts: {},
      audio: { muted: false, volume: 0.42, ambient: true, interface: true },
      soundDegraded: false,
    };

    const sanitized = sanitizePersistedCaseState({
      investigatorCode: 7,
      bootSeen: "yes",
      runCount: 0,
      completedRuns: -1,
      completedPuzzles: null,
      unlockedEvidenceIds: null,
      readDocumentIds: ["doc-case", 7],
      readMessageIds: "msg-commission",
      readEvidenceIds: {},
      evidenceVerdicts: { "ev-valid": "credible", "ev-invalid": "certain" },
      evidenceNotes: { "ev-valid": "keep", "ev-invalid": 7 },
      caseNote: null,
      discoveredAnonymous: "true",
      currentEnding: "unknown",
      endingsSeen: ["truth", "unknown"],
      puzzleAttempts: { schedule: 2, photo: -1, unknown: 3 },
      audio: { muted: "false", volume: 4, ambient: false },
      soundDegraded: "false",
    }, fallback);

    assert.deepEqual(sanitized.completedPuzzles, fallback.completedPuzzles);
    assert.deepEqual(sanitized.unlockedEvidenceIds, fallback.unlockedEvidenceIds);
    assert.deepEqual(sanitized.readDocumentIds, fallback.readDocumentIds);
    assert.deepEqual(sanitized.endingsSeen, fallback.endingsSeen);
    assert.deepEqual(sanitized.evidenceVerdicts, { "ev-valid": "credible" });
    assert.deepEqual(sanitized.evidenceNotes, { "ev-valid": "keep" });
    assert.deepEqual(sanitized.puzzleAttempts, { schedule: 2 });
    assert.deepEqual(sanitized.audio, { muted: false, volume: 0.42, ambient: false, interface: true });
    assert.equal(sanitized.runCount, 1);
    assert.equal(sanitized.currentEnding, null);
    assert.equal(sanitized.discoveredAnonymous, false);
  } finally {
    await server.close();
  }
});
