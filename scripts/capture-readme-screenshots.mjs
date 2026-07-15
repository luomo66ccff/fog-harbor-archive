import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "docs", "screenshots");
const localBaseUrl = "http://127.0.0.1:4182";
const baseUrl = process.env.CAPTURE_BASE_URL ?? localBaseUrl;
const saveKey = "fog-harbor-save-v1";

const initialEvidenceIds = [
  "ev-commission",
  "ev-case-file",
  "ev-duty",
  "ev-port-log",
  "ev-weather",
  "ev-phone",
];

const baseState = {
  investigatorCode: "ARCHIVE-07",
  bootSeen: true,
  runCount: 1,
  completedRuns: 0,
  completedPuzzles: [],
  unlockedEvidenceIds: initialEvidenceIds,
  readDocumentIds: [],
  readMessageIds: [],
  readEvidenceIds: [],
  evidenceVerdicts: {},
  evidenceNotes: {},
  evidenceRelations: {},
  evidenceReviewTouchedIds: [],
  legacyVerifiedEvidenceIds: [],
  caseNote: "",
  discoveredAnonymous: false,
  currentEnding: null,
  endingsSeen: [],
  puzzleAttempts: {},
  taskProgress: {},
  audio: { muted: true, volume: 0.42, ambient: false, interface: false },
  soundDegraded: false,
  seenNarrativeEvents: [],
  discoveredEasterEggs: [],
  provisionalTheory: { secondFigure: null },
  theoryHistory: [],
  assistedInvestigation: false,
  runStartedAt: Date.UTC(2019, 6, 12, 2, 17),
};

function startServer() {
  if (process.env.CAPTURE_BASE_URL) return null;
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmCli
    ? [npmCli, "run", "dev", "--", "--port", "4182", "--hostname", "127.0.0.1"]
    : ["run", "dev", "--", "--port", "4182", "--hostname", "127.0.0.1"];
  const child = spawn(
    command,
    args,
    {
      cwd: projectRoot,
      env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer(server) {
  let lastError = "server did not answer";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server && server.exitCode !== null) {
      throw new Error(`Screenshot server exited early with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  server.kill("SIGTERM");
}

async function seedCase(page, overrides = {}) {
  const state = { ...baseState, ...overrides };
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify({ state: value, version: 1 }));
      sessionStorage.removeItem("fog-harbor-easter-session-v1");
    },
    { key: saveKey, value: state },
  );
}

async function pngToWebp(page, png) {
  const base64 = png.toString("base64");
  const webp = await page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/webp", 0.88);
    if (!dataUrl.startsWith("data:image/webp;base64,")) {
      throw new Error("Chromium did not return a WebP screenshot.");
    }
    return dataUrl.slice(dataUrl.indexOf(",") + 1);
  }, base64);
  return Buffer.from(webp, "base64");
}

async function capture(browser, definition) {
  const context = await browser.newContext({
    viewport: definition.viewport,
    deviceScaleFactor: 1,
    locale: "zh-CN",
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  await seedCase(page, definition.state);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await definition.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  if (browserErrors.length > 0) throw new Error(browserErrors.join("\n"));
  const png = await page.screenshot({
    type: "png",
    fullPage: false,
    animations: "disabled",
  });
  const webp = await pngToWebp(page, png);
  await writeFile(path.join(outputDir, definition.fileName), webp);
  await context.close();
  process.stdout.write(`Captured ${definition.fileName} (${definition.viewport.width}x${definition.viewport.height})\n`);
}

const server = startServer();
let browser;
try {
  await mkdir(outputDir, { recursive: true });
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });

  await capture(browser, {
    fileName: "desktop-investigation.webp",
    viewport: { width: 1440, height: 900 },
    state: {},
    prepare: async (page) => {
      await page.getByRole("button", { name: /继续调查/ }).click();
      await page.getByRole("button", { name: "关闭离线收件箱" }).click();
      await page.locator('[data-window-dock="archive"]').click();
      await page.getByRole("heading", { name: "失踪事件结案摘要" }).waitFor();
      await page.evaluate(() => { document.documentElement.dataset.docCapture = "desktop"; });
    },
  });

  await capture(browser, {
    fileName: "mobile-investigation.webp",
    viewport: { width: 390, height: 844 },
    state: {},
    prepare: async (page) => {
      await page.getByRole("button", { name: /继续调查/ }).click();
      await page.getByRole("button", { name: "关闭离线收件箱" }).click();
      await page.getByText("调查应用", { exact: true }).waitFor();
    },
  });

  await capture(browser, {
    fileName: "investigator-index.webp",
    viewport: { width: 1440, height: 900 },
    state: {
      runCount: 2,
      completedRuns: 1,
      completedPuzzles: ["schedule", "frequency", "photo", "deduction", "hidden"],
      currentEnding: "seventh",
      endingsSeen: ["seventh"],
      discoveredAnonymous: true,
      discoveredEasterEggs: ["investigator-index"],
      theoryHistory: ["pursuer", "pursuer->rescuer"],
    },
    prepare: async (page) => {
      const index = page.locator('[data-easter-egg="investigator-index"]');
      await index.waitFor();
      await index.scrollIntoViewIfNeeded();
    },
  });
} finally {
  await browser?.close();
  stopServer(server);
}
