import { expect, type Locator, type Page } from "@playwright/test";

export const SAVE_KEY = "fog-harbor-save-v1";

const initialEvidenceIds = [
  "ev-commission",
  "ev-case-file",
  "ev-duty",
  "ev-port-log",
  "ev-weather",
  "ev-phone",
];

export interface BrowserErrorMonitor {
  assertClean: () => void;
}

export interface MainFlowOptions {
  touch?: boolean;
  verifyMobileLayout?: boolean;
  reviseTheory?: boolean;
  assisted?: boolean;
}

export function monitorBrowserErrors(page: Page): BrowserErrorMonitor {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return {
    assertClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export async function seedCase(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  const state = {
    investigatorCode: "E2E-07",
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
    ...overrides,
  };
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ state: value, version: 1 }));
      }
    },
    { key: SAVE_KEY, value: state },
  );
}

export async function readSavedCase(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).state as Record<string, unknown> : null;
  }, SAVE_KEY);
}

export async function enterFreshInvestigation(page: Page, code = "E2E-07") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /跳过开场/ }).click();
  await page.getByLabel("调查员代号").fill(code);
  await page.getByRole("button", { name: /认证并进入档案/ }).click();
  await expect(page.getByRole("main")).toHaveAttribute("data-story-time", "02:17");
  const closeInitialMessage = page.getByRole("button", { name: "关闭离线收件箱" });
  await expect(closeInitialMessage).toBeVisible();
  await closeInitialMessage.click();
}

export async function resumeInvestigation(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /继续调查/ }).click();
  await expect(page.getByRole("main")).toHaveAttribute("data-story-time", /\d{2}:\d{2}/);
}

export async function dismissNarrativeEvents(page: Page) {
  for (let count = 0; count < 12; count += 1) {
    const event = page.locator("[data-narrative-event]").first();
    if (!(await event.isVisible())) return;
    const id = await event.getAttribute("data-narrative-event");
    await event.getByRole("button", { name: "关闭叙事提示" }).click();
    if (id) await expect(page.locator(`[data-narrative-event="${id}"]`)).toHaveCount(0);
  }
  throw new Error("Narrative event queue exceeded the expected 12-item safety limit.");
}

export async function dismissCinematicEvents(page: Page) {
  for (let count = 0; count < 12; count += 1) {
    const event = page.locator("[data-cinematic-event]").first();
    if (!(await event.isVisible())) return;
    const id = await event.getAttribute("data-cinematic-event");
    await event.getByRole("button", { name: "关闭演出字幕" }).click();
    if (id) await expect(page.locator(`[data-cinematic-event="${id}"]`)).toHaveCount(0);
  }
  throw new Error("Cinematic event queue exceeded the expected 12-item safety limit.");
}

async function activate(page: Page, locator: Locator, touch = false) {
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  if (touch) {
    await locator.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
    const position = await locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      for (const yRatio of [0.2, 0.5, 0.8]) {
        for (const xRatio of [0.2, 0.5, 0.8]) {
          const x = bounds.left + bounds.width * xRatio;
          const y = bounds.top + bounds.height * yRatio;
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === element || element.contains(hit))) {
            return { x: bounds.width * xRatio, y: bounds.height * yRatio };
          }
        }
      }
      return null;
    });
    if (!position) throw new Error("Touch target has no unobstructed tappable area.");
    await locator.tap({ position });
  } else {
    await locator.click();
  }
}

async function openCurrentUnlock(page: Page, options: MainFlowOptions = {}) {
  await dismissCinematicEvents(page);
  await dismissNarrativeEvents(page);
  const button = page.getByRole("button", { name: /立即打开/ });
  await expect(button).toBeVisible();
  if (options.verifyMobileLayout) {
    const notification = page.locator(".unlock-notification");
    const dock = page.locator(".case-dock");
    await expect(notification).toBeVisible();
    await expect(dock).toBeVisible();
    const [notificationBox, dockBox] = await Promise.all([
      notification.boundingBox(),
      dock.boundingBox(),
    ]);
    if (!notificationBox || !dockBox) throw new Error("Unable to measure the mobile unlock notification and Dock.");
    expect(notificationBox.y + notificationBox.height).toBeLessThanOrEqual(dockBox.y);
  }
  await activate(page, button, options.touch);
  await dismissNarrativeEvents(page);
}

export async function solveSchedule(page: Page, options: MainFlowOptions = {}) {
  await activate(page, page.getByRole("button", { name: /定位当前任务：找回被偷走的十一分钟/ }), options.touch);
  for (const record of ["值班签到表", "船只进港记录", "自动气象站日志", "通话录音头"]) {
    await activate(page, page.getByRole("button", { name: new RegExp(record) }), options.touch);
  }
  await page.getByRole("slider", { name: "左右移动物理时间轴" }).fill("11");
  await activate(page, page.getByRole("button", { name: "确认校时结果" }), options.touch);
  await expect(page.getByText("时间链已校准")).toBeVisible();
  await openCurrentUnlock(page, options);
}

export async function solveFrequency(page: Page, options: MainFlowOptions = {}) {
  await page.getByRole("combobox", { name: "播放速度旋钮" }).selectOption("0.75");
  await activate(page, page.getByRole("button", { name: "高通" }), options.touch);
  await page.getByRole("slider", { name: "纸带播放头位置" }).fill("68");
  await activate(page, page.getByRole("button", { name: "播放纸带" }), options.touch);
  await activate(page, page.getByRole("button", { name: /锁定信号/ }), options.touch);
  await page.getByLabel("输入四位数字口令").fill("0712");
  await activate(page, page.getByRole("button", { name: "验证纸带" }), options.touch);
  await expect(page.getByText("纸带口令已解析")).toBeVisible();
  await openCurrentUnlock(page, options);
}

async function photoPieceIds(page: Page) {
  return page.locator(".photo-slice").evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const column = Math.round(Number.parseFloat(style.getPropertyValue("--slice-x")) / 50);
    const row = Math.round(Number.parseFloat(style.getPropertyValue("--slice-y")) / 100);
    return row * 3 + column;
  }));
}

export async function solvePhoto(page: Page, options: MainFlowOptions = {}) {
  for (let targetSlot = 0; targetSlot < 6; targetSlot += 1) {
    const ids = await photoPieceIds(page);
    const sourceSlot = ids.indexOf(targetSlot);
    if (sourceSlot === targetSlot) continue;
    const slices = page.locator(".photo-slice");
    await activate(page, slices.nth(sourceSlot), options.touch);
    await activate(page, slices.nth(targetSlot), options.touch);
  }
  await activate(page, page.getByRole("button", { name: "扫描复原" }), options.touch);
  await expect(page.getByRole("heading", { name: "检查复原照片" })).toBeVisible();
  if (options.assisted) {
    for (let index = 0; index < 5; index += 1) {
      await activate(page, page.getByRole("button", { name: /逐区扫描/ }), options.touch);
    }
  } else {
    if (!options.touch) {
      for (let index = 0; index < 6; index += 1) {
        await activate(page, page.getByRole("button", { name: /逐区扫描/ }), false);
      }
      await expect(page.getByText("0/2 细节确认")).toBeVisible();
      await expect(page.getByText("照片与现场细节已核验")).toHaveCount(0);
    }
    await activate(page, page.getByRole("button", { name: "检查船体编号区域" }), options.touch);
    await activate(page, page.getByRole("button", { name: "检查码头水线阴影区域" }), options.touch);
  }
  await expect(page.getByText("照片与现场细节已核验")).toBeVisible();
  if (options.reviseTheory) {
    await activate(page, page.getByRole("button", { name: /第二道人影是追捕者/ }), options.touch);
  }
  await openCurrentUnlock(page, options);
}

async function reviewEvidence(
  page: Page,
  title: string,
  verdict: string,
  relatedTitle: string,
  options: MainFlowOptions,
) {
  await activate(page, page.locator(".evidence-card").filter({ hasText: title }), options.touch);
  await activate(page, page.locator(".evidence-inspector .verdict-field").getByRole("button", { name: verdict }), options.touch);
  const relation = page.locator(".related-review-row").filter({ hasText: relatedTitle });
  await activate(page, relation.getByRole("button", { name: "支持" }), options.touch);
  await expect(page.locator(".evidence-inspector .evidence-review-status")).toContainText("已核验");
}

async function assignDeductionToken(page: Page, slot: string, token: string, options: MainFlowOptions) {
  await activate(page, page.locator(".token-bank button").filter({ hasText: token }), options.touch);
  await activate(page, page.locator(".chain-slot").filter({ hasText: slot }).locator(".chain-slot-target"), options.touch);
}

async function attachEvidence(page: Page, slot: string, evidence: string, options: MainFlowOptions) {
  await activate(page, page.locator(".deduction-evidence fieldset").filter({ hasText: slot }).getByRole("button", { name: new RegExp(evidence) }), options.touch);
}

export async function solveDeductionAndChooseTradeEnding(page: Page, options: MainFlowOptions = {}) {
  await reviewEvidence(page, "十一分钟校时差", "可信", "夜班签到与校时表", options);
  await reviewEvidence(page, "监控岸钟倒影", "可信", "十一分钟校时差", options);
  await reviewEvidence(page, "白鹭七号完整照片", "可信", "七号泊位进港记录", options);

  if (options.reviseTheory) {
    await activate(page, page.locator(".evidence-card").filter({ hasText: "陈牧的检修工具箱" }), options.touch);
    const correction = page.locator(".evidence-inspector .provisional-theory.is-correction");
    await activate(page, correction.getByRole("button", { name: /第二道人影是救援者/ }), options.touch);
    await dismissNarrativeEvents(page);
  }

  if (options.touch) {
    await page.locator(".window-evidence .window-content").evaluate((element) => element.scrollTo({ top: 0 }));
  }
  await activate(page, page.getByRole("button", { name: /关系推理/ }), options.touch);
  if (options.assisted) {
    await expect(page.locator(".token-bank").getByRole("button", { name: "周既明，分类：人物" })).toBeVisible();
  }
  await assignDeductionToken(page, "人物", "周既明", options);
  await assignDeductionToken(page, "时间", "00:31", options);
  await assignDeductionToken(page, "地点", "监控室", options);
  await assignDeductionToken(page, "行为", "快调系统主时钟", options);
  await assignDeductionToken(page, "目的", "掩盖白鹭七号靠泊", options);
  await attachEvidence(page, "人物", "十一分钟校时差", options);
  await attachEvidence(page, "时间", "十一分钟校时差", options);
  await attachEvidence(page, "地点", "监控岸钟倒影", options);
  await attachEvidence(page, "行为", "十一分钟校时差", options);
  await attachEvidence(page, "目的", "白鹭七号完整照片", options);
  await activate(page, page.getByRole("button", { name: "验证责任链与附件" }), options.touch);
  await expect(page.getByText("责任链已闭合")).toBeVisible();
  await openCurrentUnlock(page, options);

  await activate(page, page.locator(".candidate-list button").filter({ hasText: "林知夏" }), options.touch);
  await activate(page, page.getByRole("button", { name: /提交声纹比对/ }), options.touch);
  await expect(page.getByText("身份确认：林知夏")).toBeVisible();
  await activate(page, page.locator(".ending-options button").filter({ hasText: "接受匿名交易" }), options.touch);
  await expect(page.getByRole("heading", { name: "被删除的人" })).toBeVisible();
}

export async function completeMainFlow(page: Page, options: MainFlowOptions = {}) {
  await solveSchedule(page, options);
  await solveFrequency(page, options);
  await solvePhoto(page, options);
  await solveDeductionAndChooseTradeEnding(page, options);
}
