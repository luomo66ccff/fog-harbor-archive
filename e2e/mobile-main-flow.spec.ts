import { expect, test } from "@playwright/test";
import {
  enterFreshInvestigation,
  monitorBrowserErrors,
  readSavedCase,
  solveDeductionAndChooseTradeEnding,
  solveFrequency,
  solvePhoto,
  solveSchedule,
} from "./helpers/game";

test("390×844 touch flow preserves the complete investigation", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await enterFreshInvestigation(page, "MOBILE-07");
  await expect(page.getByText("调查应用")).toBeVisible();
  const dock = page.locator(".case-dock");
  await expect(dock).toBeVisible();
  await expect(dock).toContainText("案件档案");
  await expect(dock).toContainText("港区地图");

  await page.locator('[data-window-dock="map"]').tap();
  const mapWindow = page.getByRole("region", { name: "港区地图" });
  await expect(mapWindow).toBeVisible();
  await expect(mapWindow).toHaveCSS("position", "fixed");
  const [mapBox, dockBox] = await Promise.all([mapWindow.boundingBox(), dock.boundingBox()]);
  if (!mapBox || !dockBox) throw new Error("Unable to measure the mobile map window and Dock.");
  expect(mapBox.x).toBe(0);
  expect(mapBox.width).toBe(390);
  expect(mapBox.y + mapBox.height).toBe(dockBox.y);
  await page.getByRole("button", { name: "放大港区地图" }).tap();
  await expect(page.locator(".map-toolbar output")).toHaveText("135%");
  await page.getByRole("button", { name: "关闭港区地图" }).tap();

  const mobileFlow = { touch: true, verifyMobileLayout: true } as const;
  await solveSchedule(page, mobileFlow);
  await solveFrequency(page, mobileFlow);
  await solvePhoto(page, mobileFlow);
  await expect(page.locator(".cork-board.evidence-mode-list")).toBeVisible();
  await expect(page.getByRole("button", { name: "列表" })).toHaveClass(/is-active/);
  await solveDeductionAndChooseTradeEnding(page, mobileFlow);

  const save = await readSavedCase(page);
  expect(save?.currentEnding).toBe("trade");
  expect(save?.completedPuzzles).toEqual(expect.arrayContaining([
    "schedule",
    "frequency",
    "photo",
    "deduction",
  ]));
  browserErrors.assertClean();
});
