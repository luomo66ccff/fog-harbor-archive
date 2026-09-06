import { expect, test } from "@playwright/test";
import { openConfrontation, proveMain, confirmIdentity, openFourthClaim } from "./helpers/confrontation";
import { dismissCinematicEvents, dismissNarrativeEvents, monitorBrowserErrors, solveClaim } from "./helpers/game";

test("touch investigation can prove the fourth claim and choose the seventh ending", async ({ page }) => {
  const errors = monitorBrowserErrors(page);
  await openConfrontation(page);
  await proveMain(page, { touch: true });
  await confirmIdentity(page);
  await openFourthClaim(page);
  await solveClaim(page, "archive02-continuity", { touch: true });
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  await page.locator('[data-window-dock="finale"]').tap();
  await page.locator('[data-ending-id="seventh"]').tap();
  await expect(page.getByRole("heading", { name: "第七层以下" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  errors.assertClean();
});
