import { expect, test } from "@playwright/test";
import { enterFreshInvestigation, monitorBrowserErrors, readSavedCase, seedCase, solveSchedule } from "./helpers/game";

test("blocked browser storage still allows a complete time puzzle and backup", async ({ page }) => {
  const errors = monitorBrowserErrors(page);
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
  await enterFreshInvestigation(page, "NO-DISK");
  await expect(page.getByRole("status").filter({ hasText: "暂时无法保存" })).toBeVisible();
  await page.getByRole("button", { name: "收起存档提醒" }).click();
  await solveSchedule(page);
  await page.locator('[data-window-dock="settings"]').click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出调查备份" }).click();
  expect((await download).suggestedFilename()).toBe("fog-harbor-save.json");
  errors.assertClean();
});

test("mobile backup restore requires a preview and invalid files leave the case intact", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCase(page, { caseNote: "original note" });
  await page.goto("/");
  await page.getByText("备份与恢复", { exact: true }).click();
  const input = page.getByLabel("选择备份文件");
  await input.setInputFiles({ name: "unrelated.json", mimeType: "application/json", buffer: Buffer.from('{"unrelated":true}') });
  await expect(page.getByRole("status").filter({ hasText: "不是《雾港档案》" })).toBeVisible();
  expect((await readSavedCase(page))?.caseNote).toBe("original note");
  const original = await readSavedCase(page);
  const backup = { format: "fog-harbor-archive", schemaVersion: 3, state: { ...original, investigatorCode: "RESTORED", caseNote: "portable note" } };
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole("group", { name: "恢复预览" })).toContainText("RESTORED");
  expect((await readSavedCase(page))?.caseNote).toBe("original note");
  await page.getByRole("button", { name: "确认恢复这份档案" }).click();
  expect((await readSavedCase(page))?.caseNote).toBe("portable note");
  await page.reload();
  await expect(page.getByText("调查员 RESTORED", { exact: true })).toBeVisible();
});

test("a legacy ending is migrated without altering the original v1 file", async ({ page }) => {
  const legacy = JSON.stringify({ version: 1, state: { investigatorCode: "OLD-07", runCount: 2, bootSeen: true, completedPuzzles: ["schedule", "frequency", "photo", "deduction", "hidden"], currentEnding: "seventh", endingsSeen: ["seventh"] } });
  await page.addInitScript((raw) => localStorage.setItem("fog-harbor-save-v1", raw), legacy);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "第七层以下" })).toBeVisible();
  const saved = await readSavedCase(page);
  expect(saved?.currentEnding).toBe("seventh");
  expect(saved?.storyVersion).toBe(3);
  expect(Object.keys(saved?.claimSubmissions as object)).toHaveLength(4);
  expect(await page.evaluate(() => localStorage.getItem("fog-harbor-save-v1"))).toBe(legacy);
});
