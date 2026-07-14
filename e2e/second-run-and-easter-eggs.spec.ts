import { expect, test } from "@playwright/test";
import {
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
  const seal = page.getByRole("button", { name: /红色归档印章/ });
  for (let count = 0; count < 7; count += 1) await seal.click();

  await expect(seal).toHaveAccessibleName(/已按下 7 次/);
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
  await expect(index.getByText("INDEX-07")).toBeVisible();
  await expect(index.getByText("2 / 8")).toBeVisible();
  const saved = await readSavedCase(page);
  expect(saved?.currentEnding).toBe("seventh");
  expect(saved?.discoveredEasterEggs).toEqual(expect.arrayContaining(["seven-stamp", "investigator-index"]));
  expect(saved?.seenNarrativeEvents).toEqual(expect.arrayContaining(["investigator-file-created"]));
  browserErrors.assertClean();
});
