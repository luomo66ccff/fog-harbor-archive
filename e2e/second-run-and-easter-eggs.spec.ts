import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  dismissCinematicEvents,
  dismissNarrativeEvents,
  enterFreshInvestigation,
  monitorBrowserErrors,
  readSavedCase,
  resumeInvestigation,
  seedCase,
} from "./helpers/game";

test("seven seal activations reveal a secret without changing case completion", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await enterFreshInvestigation(page, "SEAL-07");
  await page.locator('[data-window-dock="archive"]').click();
  await expect(page.getByText("后出现的铅笔批注")).toHaveCount(0);
  const before = await readSavedCase(page);
  const seal = page.getByRole("button", { name: "可按压的归档印章" });
  await expect(seal).not.toContainText(/0\s*\/\s*7/);
  await expect(seal).toHaveAccessibleName("可按压的归档印章");
  for (let count = 1; count <= 7; count += 1) {
    await seal.click();
    if (count === 3) await expect(seal).toHaveAttribute("data-stage", "inked");
    if (count === 5) await expect(seal).toHaveAttribute("data-stage", "marked");
    if (count === 6) await expect(seal).toHaveAttribute("data-stage", "almost");
  }

  await expect(seal).toHaveAccessibleName("可按压的归档印章");
  await expect(seal).toHaveAttribute("data-stage", "revealed");
  await expect(page.locator(".seven-stamp-copy")).toBeVisible();
  const after = await readSavedCase(page);
  expect(after?.discoveredEasterEggs).toEqual(expect.arrayContaining(["seven-stamp"]));
  expect(after?.completedPuzzles).toEqual(before?.completedPuzzles);
  expect(after?.currentEnding).toEqual(before?.currentEnding);
  browserErrors.assertClean();
});

test("second run exposes the pencil note while the first run does not", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await seedCase(page, {
    investigatorCode: "SECOND-07",
    runCount: 2,
    completedRuns: 1,
    endingsSeen: ["trade"],
  });
  await resumeInvestigation(page);
  await page.locator('[data-window-dock="archive"]').click();
  await expect(page.getByText("后出现的铅笔批注")).toBeVisible();
  await expect(page.getByText(/我看到你第二次打开它了，SECOND-07/)).toBeVisible();

  browserErrors.assertClean();
});

test("mobile rain trace remains readable and clickable without covering the launcher", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterFreshInvestigation(page, "RAIN-07");
  const taskDescription = page.locator(".current-task-target > span:not(.current-task-kicker):not(.current-task-action)");
  const descriptionFontSize = await taskDescription.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  expect(descriptionFontSize).toBeGreaterThanOrEqual(14);
  const taskBox = await page.locator(".current-task-card").boundingBox();
  const rainBox = await page.locator(".rain-trace-secret").boundingBox();
  const firstLauncherBox = await page.locator(".desk-object.object-archive").boundingBox();
  expect(taskBox && rainBox && firstLauncherBox).toBeTruthy();
  expect(rainBox!.y).toBeGreaterThanOrEqual(taskBox!.y + taskBox!.height - 2);
  expect(rainBox!.y + rainBox!.height).toBeLessThan(firstLauncherBox!.y);
  await page.getByRole("button", { name: "擦拭玻璃" }).click();
  await expect(page.getByText("别相信所有救你的人。", { exact: true })).toBeVisible();
  const saved = await readSavedCase(page);
  expect(saved?.discoveredEasterEggs).toEqual(expect.arrayContaining(["rain-trace"]));
  browserErrors.assertClean();
});

test("choosing the seventh ending records and renders the local investigator index", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  const criticalIds = [
    "ev-case-file", "ev-duty", "ev-port-log", "ev-weather", "ev-phone",
    "ev-offset", "ev-audio-0712", "ev-photo", "ev-cctv", "ev-fake-clerk",
    "ev-manifest", "ev-notebook", "ev-closure-order", "ev-final-chain", "ev-seven-map",
  ];
  await seedCase(page, {
    investigatorCode: "INDEX-07",
    completedPuzzles: ["schedule", "frequency", "photo", "deduction", "hidden"],
    unlockedEvidenceIds: ["ev-commission", ...criticalIds],
    readEvidenceIds: criticalIds,
    legacyVerifiedEvidenceIds: criticalIds,
    discoveredAnonymous: true,
    completedRuns: 1,
    endingsSeen: ["trade"],
    discoveredEasterEggs: ["seven-stamp"],
    runStartedAt: Date.UTC(2019, 6, 12, 2, 17),
  });
  await resumeInvestigation(page);
  await dismissNarrativeEvents(page);
  await page.locator('[data-window-dock="finale"]').click();
  await dismissNarrativeEvents(page);
  const seventh = page.locator('[data-ending-id="seventh"]');
  await expect(seventh).toBeEnabled();
  await seventh.click();

  const index = page.locator('[data-easter-egg="investigator-index"]');
  await expect(index.getByRole("heading", { name: "调查员档案已创建" })).toBeVisible();
  await expect(index.getByText("INDEX-07", { exact: true })).toBeVisible();
  await expect(index.getByText("P-07-0712 / INDEX-07")).toBeVisible();
  await expect(index.getByText("ACTIVE", { exact: true })).toBeVisible();
  await expect(index.getByText("尚未命名。")).toBeVisible();
  const saved = await readSavedCase(page);
  expect(saved?.currentEnding).toBe("seventh");
  expect(saved?.discoveredEasterEggs).toEqual(expect.arrayContaining(["seven-stamp", "investigator-index"]));
  expect(saved?.seenNarrativeEvents).toEqual(expect.arrayContaining(["investigator-index-written"]));
  browserErrors.assertClean();
});

test("mirror map starts as a quiet symbol and becomes explicit only after discovery", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await seedCase(page, { investigatorCode: "MIRROR-07", discoveredAnonymous: true });
  await resumeInvestigation(page);
  await page.locator('[data-window-dock="map"]').click();
  const symbol = page.getByRole("button", { name: "异常镜像符号" });
  await expect(symbol).toBeVisible();
  await expect(page.getByText("镜像查看地图背面")).toHaveCount(0);
  await symbol.focus();
  await expect(page.getByText("印刷方向似乎与其他图例相反。")).toBeVisible();
  const before = await readSavedCase(page);
  await symbol.click();
  await expect(page.getByRole("button", { name: "恢复正向地图" })).toBeVisible();
  await expect(page.getByText(/六个沿岸节点仅保留模糊编号/)).toBeVisible();
  const after = await readSavedCase(page);
  expect(after?.completedPuzzles).toEqual(before?.completedPuzzles);
  expect(after?.currentEnding).toEqual(before?.currentEnding);
  browserErrors.assertClean();
});

test("second-run knock waits for real inactivity across pointer movement", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.clock.install({ time: new Date("2019-07-12T02:17:00Z") });
  await seedCase(page, { investigatorCode: "IDLE-07", runCount: 2, completedRuns: 1, endingsSeen: ["trade"] });
  await resumeInvestigation(page);
  for (let step = 0; step < 3; step += 1) {
    await page.clock.fastForward(10_000);
    await page.mouse.move(80 + step * 20, 120 + step * 10);
    await expect(page.getByText(/这一次，你比上次更快/)).toHaveCount(0);
  }
  await page.clock.fastForward(15_000);
  await expect(page.getByText(/这一次，你比上次更快/)).toHaveCount(0);
  await page.clock.fastForward(3_100);
  await expect(page.getByText(/这一次，你比上次更快/)).toBeVisible();
  browserErrors.assertClean();
});

test("external reader beat waits until the final dossier is actually open", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await seedCase(page, {
    investigatorCode: "READER-07",
    completedPuzzles: ["deduction"],
    seenCinematicEvents: ["chain-closed"],
  });
  await resumeInvestigation(page);
  await expect(page.locator('[data-narrative-event="external-reader-detected"]')).toHaveCount(0);
  await page.locator('[data-window-dock="finale"]').click();
  await expect(page.locator('[data-narrative-event="external-reader-detected"]')).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-cinematic-event", "external-reader");
  const mirroredTitle = await page.locator(".final-dossier > header > span").evaluate((node) => (
    getComputedStyle(node, "::after").content.replaceAll('"', "")
  ));
  expect(mirroredTitle).toBe("ARCHIVE / MIRRORED SESSION");
  browserErrors.assertClean();
});

test("truth and trade endings render their distinct aftermath", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await seedCase(page, { investigatorCode: "TRUTH-07", currentEnding: "truth", completedRuns: 1, endingsSeen: ["truth"] });
  await page.goto("/");
  await dismissCinematicEvents(page);
  await expect(page.getByText("“我看到了。”")).toBeVisible();
  await expect(page.getByText("UNKNOWN / TIDE RELAY")).toBeVisible();

  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) ?? "{}").state ?? {};
    localStorage.setItem(key, JSON.stringify({ state: { ...state, currentEnding: "trade", endingsSeen: ["truth", "trade"] }, version: 1 }));
  }, "fog-harbor-save-v1");
  await page.reload();
  await dismissCinematicEvents(page);
  await expect(page.getByText("档案删除：1")).toBeVisible();
  await expect(page.getByText("副本创建：1")).toBeVisible();
  browserErrors.assertClean();
});

test("investigation log opens, groups runs, and exports a sanitized text file", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await seedCase(page, {
    investigatorCode: "../LOG:07",
    completedPuzzles: ["schedule", "frequency"],
    caseNote: "岸钟复核。IP: 203.0.113.7；设备型号: HarborBook",
    seenNarrativeEvents: ["first-time-contradiction"],
    discoveredEasterEggs: ["seven-stamp"],
  });
  await resumeInvestigation(page);
  await dismissCinematicEvents(page);
  await page.locator('[data-window-dock="notes"]').click();
  await page.getByRole("tab", { name: "调查笔记" }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "系统记录" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "本轮调查日志" })).toBeVisible();
  await expect(page.getByText("时间校准、纸带解码")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出纯文本" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^fog-harbor-investigation-[^<>:"/\\|?*]+\.txt$/);
  const path = await download.path();
  if (!path) throw new Error("Playwright did not retain the exported investigation log.");
  const text = await readFile(path, "utf8");
  expect(text).toContain("[玩家笔记]");
  expect(text).toContain("[系统记录]");
  expect(text).not.toContain("203.0.113.7");
  expect(text).not.toContain("HarborBook");
  browserErrors.assertClean();
});
