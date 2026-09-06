import { expect, test } from "@playwright/test";
import { openConfrontation, proveMain, confirmIdentity, openFourthClaim } from "./helpers/confrontation";
import { dismissCinematicEvents, dismissNarrativeEvents, monitorBrowserErrors, readSavedCase, resumeInvestigation, solveClaim } from "./helpers/game";

test("an unsubmitted draft survives changing topics and reopening the browser", async ({ page }) => {
  await openConfrontation(page);
  await page.locator('input[value="shore-clock-slow"]').check();
  const source = page.locator('[data-source-id="ev-weather"]');
  await source.locator("summary").click();
  await source.getByRole("checkbox").check();
  await page.locator('[data-claim-tab="heron-coverup"]').click();
  await page.locator('[data-claim-tab="clock-fabrication"]').click();
  await expect(page.locator('input[value="shore-clock-slow"]')).toBeChecked();
  expect((await readSavedCase(page))?.claimSubmissions).toEqual({});
  await resumeInvestigation(page);
  await page.locator('[data-window-dock="evidence"]').click();
  await page.getByRole("button", { name: "关键对质", exact: true }).click();
  await expect(page.locator('input[value="shore-clock-slow"]')).toBeChecked();
  await expect(page.locator(".claim-source-heading")).toContainText("已附入 1 份");
});

test("incorrect claims remain revisable and verified work survives a reload", async ({ page }) => {
  const errors = monitorBrowserErrors(page);
  await openConfrontation(page);
  await page.locator('input[value="shore-clock-slow"]').check();
  await page.getByRole("button", { name: "提交本项对质" }).click();
  await expect(page.locator(".claim-established")).toHaveCount(0);
  expect((await readSavedCase(page))?.completedPuzzles).not.toContain("deduction");
  await solveClaim(page, "clock-fabrication");
  await page.reload();
  await resumeInvestigation(page);
  await page.locator('[data-window-dock="evidence"]').click();
  await page.getByRole("button", { name: "关键对质", exact: true }).click();
  await expect(page.locator(".claim-established")).toContainText("此项对质已成立");
  await expect(page.locator('input[value="manual-clock-and-weather-template"]')).toBeChecked();
  errors.assertClean();
});

test("truth requires all three real confrontations and verified identity", async ({ page }) => {
  const errors = monitorBrowserErrors(page);
  await openConfrontation(page);
  await proveMain(page);
  await expect(page.locator('[data-ending-id="truth"]')).toBeDisabled();
  await expect(page.locator('[data-ending-id="trade"]')).toBeEnabled();
  await confirmIdentity(page);
  await page.locator('[data-ending-id="truth"]').click();
  await expect(page.getByRole("heading", { name: "雾散以前" })).toBeVisible();
  expect((await readSavedCase(page))?.currentEnding).toBe("truth");
  errors.assertClean();
});

test("the hidden password alone cannot open the seventh ending", async ({ page }) => {
  const errors = monitorBrowserErrors(page);
  await openConfrontation(page);
  await proveMain(page);
  await confirmIdentity(page);
  await openFourthClaim(page);
  await solveClaim(page, "archive02-continuity");
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  await page.locator('[data-window-dock="finale"]').click();
  await expect(page.locator(".final-dossier")).toContainText("沿用 2019 年销毁作业指纹");
  await page.locator('[data-ending-id="seventh"]').click();
  await expect(page.getByRole("heading", { name: "第七层以下" })).toBeVisible();
  expect((await readSavedCase(page))?.currentEnding).toBe("seventh");
  errors.assertClean();
});
