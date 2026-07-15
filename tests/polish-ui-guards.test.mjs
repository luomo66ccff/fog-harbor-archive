import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("stamp and mirror affordances stay discoverable without exposing their solution", async () => {
  const [archive, records] = await Promise.all([
    source("components/windows/ArchiveWindow.tsx"),
    source("components/windows/RecordsWindows.tsx"),
  ]);
  assert.match(archive, /aria-label="可按压的归档印章"/);
  assert.doesNotMatch(archive, /aria-label=\{`[^`]*(?:click|按下|次数|\/ 7)/i);
  assert.match(archive, /clicks >= 7[\s\S]*clicks >= 6[\s\S]*clicks >= 5[\s\S]*clicks >= 3/);
  assert.match(records, /"异常镜像符号"/);
  assert.match(records, /印刷方向似乎与其他图例相反。/);
  assert.doesNotMatch(records, /镜像查看地图背面/);
});

test("idle hook resets from every required activity source and pauses off-page", async () => {
  const idle = await source("components/hooks/useIdleActivity.ts");
  for (const event of ["pointerdown", "pointermove", "keydown", "wheel", "touchmove", "visibilitychange", "focus", "blur"]) {
    assert.match(idle, new RegExp(`addEventListener\\(\"${event}\"`));
    assert.match(idle, new RegExp(`removeEventListener\\(\"${event}\"`));
  }
  assert.match(idle, /pointerMoveThrottleMs = 500/);
  assert.match(idle, /document\.visibilityState === "visible" && document\.hasFocus\(\)/);
  assert.match(idle, /now - lastPointerMoveAt < pointerThrottle/);
});

test("README screenshots are real WebP files with fixed capture sizes and no public PNG", async () => {
  const expected = [
    "desktop-investigation.webp",
    "mobile-investigation.webp",
    "investigator-index.webp",
  ];
  for (const name of expected) {
    const path = new URL(`docs/screenshots/${name}`, root);
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok((await stat(path)).size > 10_000);
  }
  const script = await source("scripts/capture-readme-screenshots.mjs");
  assert.match(script, /viewport: \{ width: 1440, height: 900 \}/);
  assert.match(script, /viewport: \{ width: 390, height: 844 \}/);
  assert.match(script, /investigatorCode: "ARCHIVE-07"/);
  const publicEntries = await readdir(new URL("public/", root), { recursive: true });
  assert.equal(publicEntries.filter((name) => name.toLowerCase().endsWith(".png")).length, 0);
});

test("cinematic UI exposes skip controls and static reduced-motion presentation", async () => {
  const [layer, caption, engine, visibility, ambient, audio, secrets, css] = await Promise.all([
    source("components/cinematic/CinematicEventLayer.tsx"),
    source("components/cinematic/CinematicCaption.tsx"),
    source("lib/cinematic-engine.ts"),
    source("components/hooks/usePageVisibility.ts"),
    source("components/narrative/AmbientEventLayer.tsx"),
    source("lib/audio-manager.ts"),
    source("components/narrative/EnvironmentalSecrets.tsx"),
    source("app/evidence-upgrade.css"),
  ]);
  assert.match(caption, /aria-label="关闭演出字幕"/);
  assert.match(layer, /useReducedMotion\(\)/);
  assert.match(engine, /mode: "static"/);
  assert.match(engine, /environment: "none"/);
  assert.match(engine, /pulse: "none"/);
  assert.match(visibility, /document\.visibilityState === "visible"/);
  assert.match(visibility, /updateVisibility\(\)/);
  assert.match(layer, /dataset\.cinematicPaused/);
  assert.match(layer, /document\.visibilityState !== "visible"/);
  assert.match(ambient, /!activeEvent \|\| !pageVisible/);
  assert.match(audio, /ambientGain\.gain\.cancelScheduledValues\(at\)/);
  assert.match(secrets, /event\.target !== event\.currentTarget/);
  assert.match(css, /html\[data-cinematic-paused="true"\]/);
  assert.match(css, /\.ambient-event\.is-paused/);
});
