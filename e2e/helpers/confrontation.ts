import { expect, type Page } from "@playwright/test";
import { initialEvidenceIds, puzzleRewards } from "../../lib/evidence-data";
import { dismissCinematicEvents, dismissNarrativeEvents, resumeInvestigation, seedCase, solveClaim, type MainFlowOptions } from "./game";

export async function openConfrontation(page: Page) {
  const completed = ["schedule", "frequency", "photo"];
  await seedCase(page, {
    storyVersion: 3,
    claimSubmissions: {},
    completedPuzzles: completed,
    unlockedEvidenceIds: [...initialEvidenceIds, ...completed.flatMap((id) => puzzleRewards[id])],
  });
  await resumeInvestigation(page);
  await page.locator('[data-window-dock="evidence"]').click();
  await page.getByRole("button", { name: "关键对质", exact: true }).click();
}

export async function proveMain(page: Page, options: MainFlowOptions = {}) {
  for (const id of ["clock-fabrication", "heron-coverup", "ladder-escape"] as const) await solveClaim(page, id, options);
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  await page.locator('[data-window-dock="finale"]').click();
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
}

export async function confirmIdentity(page: Page) {
  await page.locator(".candidate-list button").filter({ hasText: "林知夏" }).click();
  await page.getByRole("button", { name: "提交声纹比对" }).click();
  await expect(page.getByText("身份确认：林知夏")).toBeVisible();
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
}

export async function openFourthClaim(page: Page) {
  await page.getByLabel("输入翻转后的五位口令").fill("TIDE7");
  await page.getByRole("button", { name: "打开第七层", exact: true }).click();
  await expect(page.locator('[data-ending-id="seventh"]')).toBeDisabled();
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  for (let count = 0; count < 5; count += 1) {
    const later = page.getByRole("button", { name: "稍后处理" });
    if (!(await later.isVisible())) break;
    await later.click();
  }
  await page.getByRole("button", { name: "返回关键对质" }).click();
}
