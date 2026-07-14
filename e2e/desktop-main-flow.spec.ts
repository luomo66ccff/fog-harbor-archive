import { expect, test } from "@playwright/test";
import {
  completeMainFlow,
  enterFreshInvestigation,
  monitorBrowserErrors,
  readSavedCase,
} from "./helpers/game";

test("desktop investigation reaches a real ending through every core puzzle", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await enterFreshInvestigation(page, "DESKTOP-07");
  await page.locator('[data-window-dock="audio"]').click();
  const lockDialog = page.getByRole("dialog", { name: "录音带修复台暂时不可访问" });
  await expect(lockDialog).toContainText("可信的系统时间偏移");
  await lockDialog.getByRole("button", { name: "关闭锁定说明" }).click();
  await completeMainFlow(page, { reviseTheory: true });

  const save = await readSavedCase(page);
  expect(save?.currentEnding).toBe("trade");
  expect(save?.completedPuzzles).toEqual(expect.arrayContaining([
    "schedule",
    "frequency",
    "photo",
    "deduction",
  ]));
  expect(save?.theoryHistory).toEqual(expect.arrayContaining([
    "pursuer",
    "pursuer->rescuer",
  ]));
  browserErrors.assertClean();
});

test("assisted investigation mode remains fully playable", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await enterFreshInvestigation(page, "ASSIST-07");
  await page.locator('[data-window-dock="settings"]').click();
  const assisted = page.getByRole("checkbox", { name: /辅助调查模式/ });
  await assisted.check();
  await expect(assisted).toBeChecked();
  await expect(page.getByText(/逐区扫描会自动确认照片异常/)).toBeVisible();
  await page.getByRole("button", { name: "关闭系统设置" }).click();

  await completeMainFlow(page, { assisted: true });
  const save = await readSavedCase(page);
  expect(save?.assistedInvestigation).toBe(true);
  expect(save?.currentEnding).toBe("trade");
  browserErrors.assertClean();
});
