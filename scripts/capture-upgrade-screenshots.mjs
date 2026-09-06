import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(project, "docs/screenshots");
const baseURL = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:4173";
const existing = await readdir(output).catch(() => []);
const nextVersion = 1 + Math.max(0, ...existing.map((name) => Number(name.match(/^confrontation-(?:desktop|mobile)-t(\d+)\.webp$/)?.[1] ?? 0)));
const version = process.env.CAPTURE_VERSION ?? `t${String(nextVersion).padStart(3, "0")}`;
assert.match(version, /^t\d{3}$/);
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL } : {}) });
const state = {
  storyVersion: 3, investigatorCode: "ARCHIVE-07", bootSeen: true, runCount: 1,
  completedPuzzles: ["schedule", "frequency", "photo"], claimSubmissions: {}, claimDrafts: {},
  audio: { muted: true, volume: 0, ambient: false, interface: false },
};

async function screenshot(page, filename) {
  await page.evaluate(() => document.fonts.ready);
  const errors = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth }));
  assert.equal(errors.overflow, false);
  const png = await page.screenshot({ animations: "disabled" });
  const base64 = await page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.toDataURL("image/webp", 0.9).split(",")[1];
  }, png.toString("base64"));
  await writeFile(resolve(output, filename), Buffer.from(base64, "base64"), { flag: "wx" });
  console.log(filename);
}

try {
  await mkdir(output, { recursive: true });
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "zh-CN" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((saved) => localStorage.setItem("fog-harbor-save-v3", JSON.stringify({ version: 3, state: saved })), state);
    await page.goto(baseURL);
    await page.getByRole("button", { name: /继续调查/ }).click();
    await page.locator('[data-window-dock="evidence"]').click();
    await page.getByRole("button", { name: "关键对质", exact: true }).click();
    await page.getByRole("heading", { name: "让每一个结论经得起反问" }).waitFor();
    // Dismiss the same skippable prompts a player can dismiss before photographing.
    for (let count = 0; count < 12; count += 1) {
      await page.waitForTimeout(150);
      let dismissed = false;
      for (const name of ["关闭演出字幕", "关闭叙事提示", "稍后处理"]) {
        const control = page.getByRole("button", { name, exact: true });
        if (await control.isVisible()) { await control.click(); dismissed = true; }
      }
      if (!dismissed) break;
    }
    assert.deepEqual(errors, []);
    await screenshot(page, `confrontation-${name}-${version}.webp`);
    await context.close();
  }
} finally {
  await browser.close();
}
