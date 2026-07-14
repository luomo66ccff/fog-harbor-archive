import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const viteServer = createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
  resolve: { alias: { "@": root } },
});

async function loadModule(path) {
  return (await viteServer).ssrLoadModule(path);
}

after(async () => {
  await (await viteServer).close();
});

test("ships all ten WebP investigation assets declared by the manifest", async () => {
  const assetDirectory = new URL("../public/assets/fog-harbor/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("ASSET_MANIFEST.json", assetDirectory), "utf8"),
  );
  const webpFiles = (await readdir(assetDirectory)).filter((name) => name.endsWith(".webp"));

  assert.equal(manifest.length, 10);
  assert.equal(webpFiles.length, 10);
  assert.equal(new Set(manifest.map((asset) => asset.id)).size, 10);
  assert.equal(new Set(manifest.map((asset) => asset.webp)).size, 10);

  for (const asset of manifest) {
    assert.match(asset.webp, /^\/assets\/fog-harbor\/[a-z0-9-]+\.webp$/);
    assert.ok(Number.isInteger(asset.width) && asset.width > 0);
    assert.ok(Number.isInteger(asset.height) && asset.height > 0);
    const file = new URL(`../public${asset.webp}`, import.meta.url);
    assert.ok((await stat(file)).size > 0, `${asset.webp} should not be empty`);
    assert.ok(webpFiles.includes(asset.webp.split("/").at(-1)));
  }
});

test("advances through five current tasks and sends locked modules to the real prerequisite", async () => {
  const {
    getCurrentInvestigationTask,
    getInvestigationTasks,
    getModuleAccess,
    taskTarget,
  } = await loadModule("/lib/progression-engine.ts");

  const stages = [
    {
      completed: [],
      taskId: "restore-time",
      target: { windowId: "archive", tab: "schedule" },
    },
    {
      completed: ["schedule"],
      taskId: "repair-call",
      target: { windowId: "audio", tab: "analyze" },
    },
    {
      completed: ["schedule", "frequency"],
      taskId: "reconstruct-photo",
      target: { windowId: "surveillance" },
    },
    {
      completed: ["schedule", "frequency", "photo"],
      taskId: "close-chain",
      target: { windowId: "evidence", tab: "deduction" },
    },
    {
      completed: ["schedule", "frequency", "photo", "deduction"],
      taskId: "review-finale",
      target: { windowId: "finale" },
    },
  ];

  for (const [index, stage] of stages.entries()) {
    const context = { completedPuzzles: stage.completed };
    const tasks = getInvestigationTasks(context);
    const current = getCurrentInvestigationTask(context);
    assert.equal(tasks.length, 5);
    assert.equal(current.id, stage.taskId);
    assert.deepEqual(taskTarget(current), stage.target);
    assert.deepEqual(tasks.map((task) => task.completed), [
      ...Array(index).fill(true),
      ...Array(5 - index).fill(false),
    ]);
  }

  const lockChecks = [
    { completed: [], moduleId: "audio", required: "schedule", nextTarget: stages[0].target },
    { completed: ["schedule"], moduleId: "surveillance", required: "frequency", nextTarget: stages[1].target },
    { completed: ["schedule", "frequency"], moduleId: "evidence", required: "photo", nextTarget: stages[2].target },
    { completed: ["schedule", "frequency", "photo"], moduleId: "finale", required: "deduction", nextTarget: stages[3].target },
  ];

  for (const check of lockChecks) {
    const locked = getModuleAccess(check.completed, check.moduleId);
    assert.equal(locked.unlocked, false);
    assert.equal(locked.requiredPuzzle, check.required);
    assert.deepEqual(locked.nextTarget, check.nextTarget);
    assert.equal(getModuleAccess([...check.completed, check.required], check.moduleId).unlocked, true);
  }

  const finishedTasks = getInvestigationTasks({
    completedPuzzles: ["schedule", "frequency", "photo", "deduction"],
    currentEnding: "truth",
  });
  assert.ok(finishedTasks.every((task) => task.completed));
});

test("only a +11 minute offset aligns every timeline event", async () => {
  const {
    evaluateTimelineAlignment,
    timelineEvents,
    TIMELINE_CORRECT_OFFSET,
    TIMELINE_MAX_OFFSET,
    TIMELINE_MIN_OFFSET,
  } = await loadModule("/lib/puzzle-engine.ts");

  assert.equal(TIMELINE_CORRECT_OFFSET, 11);
  const completeOffsets = [];
  for (let offset = TIMELINE_MIN_OFFSET; offset <= TIMELINE_MAX_OFFSET; offset += 1) {
    const result = evaluateTimelineAlignment(offset);
    if (result.complete) completeOffsets.push(offset);
  }
  assert.deepEqual(completeOffsets, [11]);

  const aligned = evaluateTimelineAlignment(11);
  assert.deepEqual(aligned.alignedIds, timelineEvents.map((event) => event.id));
  assert.deepEqual(aligned.misalignedIds, []);
  assert.equal(aligned.direction, "aligned");
});

test("frequency evidence locks only after playback really crosses the signal window", async () => {
  const {
    canLockFrequencySignal,
    FREQUENCY_SIGNAL_WINDOW,
    isFrequencySignalWindow,
  } = await loadModule("/lib/puzzle-engine.ts");

  const inWindow = FREQUENCY_SIGNAL_WINDOW.start;
  assert.equal(isFrequencySignalWindow(inWindow), true);
  assert.equal(isFrequencySignalWindow(FREQUENCY_SIGNAL_WINDOW.end), true);
  assert.equal(isFrequencySignalWindow(inWindow - 1), false);
  assert.equal(isFrequencySignalWindow(FREQUENCY_SIGNAL_WINDOW.end + 1), false);

  assert.equal(canLockFrequencySignal({
    speed: 0.75,
    filter: "high",
    progress: inWindow,
    playedSignalWindow: false,
  }), false, "being positioned in the region is not proof that it was played");
  assert.equal(canLockFrequencySignal({
    speed: 0.75,
    filter: "high",
    progress: inWindow - 1,
    playedSignalWindow: true,
  }), false, "past playback cannot lock outside the critical region");
  assert.equal(canLockFrequencySignal({
    speed: 1,
    filter: "high",
    progress: inWindow,
    playedSignalWindow: true,
  }), false, "the playback setup must also be correct");
  assert.equal(canLockFrequencySignal({
    speed: 0.75,
    filter: "high",
    progress: inWindow,
    playedSignalWindow: true,
  }), true);
});

test("photo shuffling, swapping, misplacement validation, and both hotspots share one model", async () => {
  const {
    arePhotoHotspotsComplete,
    countMisplacedPhotoPieces,
    createPhotoPieces,
    isPhotoSolved,
    movePhotoPiece,
    PHOTO_PIECE_IDS,
    shufflePhotoPieceIds,
    shufflePhotoPieces,
  } = await loadModule("/lib/puzzle-engine.ts");

  const identity = [...PHOTO_PIECE_IDS];
  const randomSources = [
    () => 0,
    () => 0.999999,
    (() => {
      const values = [0.16, 0.83, 0.42, 0.67, 0.04];
      let index = 0;
      return () => values[index++ % values.length];
    })(),
  ];
  for (const random of randomSources) {
    const order = shufflePhotoPieceIds(random);
    assert.deepEqual([...order].sort((left, right) => left - right), identity);
    assert.notDeepEqual(order, identity);
  }

  const shuffledPieces = shufflePhotoPieces(() => 0.999999);
  assert.equal(countMisplacedPhotoPieces(shuffledPieces), 2);
  assert.equal(isPhotoSolved(shuffledPieces), false);

  const solved = createPhotoPieces();
  assert.equal(countMisplacedPhotoPieces(solved), 0);
  assert.equal(isPhotoSolved(solved), true);
  for (const pieceId of PHOTO_PIECE_IDS) {
    for (const targetSlot of PHOTO_PIECE_IDS) {
      const moved = movePhotoPiece(solved, pieceId, targetSlot);
      const expectedMisplaced = pieceId === targetSlot ? 0 : 2;
      assert.equal(countMisplacedPhotoPieces(moved), expectedMisplaced);
      assert.equal(isPhotoSolved(moved), expectedMisplaced === 0);
    }
  }

  const swapped = movePhotoPiece(solved, 0, 1);
  const restored = movePhotoPiece(swapped, 0, 0);
  assert.deepEqual(restored, solved);
  assert.equal(isPhotoSolved([
    { id: 0, slot: 0 },
    { id: 1, slot: 0 },
    ...solved.slice(2),
  ]), false, "duplicate slots cannot be accepted as a solved image");

  assert.equal(arePhotoHotspotsComplete([]), false);
  assert.equal(arePhotoHotspotsComplete(["ship-number"]), false);
  assert.equal(arePhotoHotspotsComplete(["second-figure"]), false);
  assert.equal(arePhotoHotspotsComplete(["ship-number", "second-figure"]), true);
});

test("evidence review and five-link deduction report exact validation counts", async () => {
  const {
    evaluateDeductionSubmission,
    evaluateEvidenceReview,
    getVerifiedEvidenceIds,
  } = await loadModule("/lib/evidence-engine.ts");
  const { deductionAnswer } = await loadModule("/lib/puzzle-engine.ts");

  assert.equal(evaluateEvidenceReview("ev-offset", "credible", {
    supports: ["ev-cctv"],
    contradicts: [],
  }).verified, true);
  assert.equal(evaluateEvidenceReview("ev-offset", "doubtful", {
    supports: ["ev-cctv"],
    contradicts: [],
  }).verified, false);
  assert.equal(evaluateEvidenceReview("ev-offset", "credible", {
    supports: ["ev-phone"],
    contradicts: [],
  }).verified, false);
  assert.equal(evaluateEvidenceReview("ev-case-file", "forged", {
    supports: [],
    contradicts: ["ev-weather"],
  }).verified, true);

  const verifiedIds = getVerifiedEvidenceIds({
    visibleEvidenceIds: ["ev-commission", "ev-offset", "ev-photo"],
    legacyVerifiedEvidenceIds: ["ev-commission", "ev-photo"],
    touchedEvidenceIds: ["ev-photo"],
    verdicts: { "ev-offset": "credible", "ev-photo": "credible" },
    relations: {
      "ev-offset": { supports: ["ev-cctv"], contradicts: [] },
      "ev-photo": { supports: ["ev-port-log"], contradicts: [] },
    },
  });
  assert.deepEqual(new Set(verifiedIds), new Set(["ev-commission", "ev-offset", "ev-photo"]));

  const supportedChain = {
    person: ["ev-offset"],
    time: ["ev-offset"],
    place: ["ev-cctv"],
    action: ["ev-offset"],
    motive: ["ev-photo"],
  };
  const verifiedForChain = ["ev-duty", "ev-offset", "ev-cctv", "ev-photo"];
  assert.deepEqual(evaluateDeductionSubmission(
    deductionAnswer,
    supportedChain,
    verifiedForChain,
    {},
  ), {
    solved: true,
    logicErrors: 0,
    evidenceSupportMissing: 0,
    contradictionCount: 0,
  });

  const countedFailure = evaluateDeductionSubmission(
    { ...deductionAnswer, time: "00:42" },
    {
      person: ["ev-duty", "ev-offset"],
      time: [],
      place: ["ev-cctv"],
      action: ["ev-duty"],
      motive: [],
    },
    verifiedForChain,
    {
      "ev-duty": { supports: [], contradicts: ["ev-offset"] },
      "ev-offset": { supports: [], contradicts: ["ev-duty"] },
    },
  );
  assert.deepEqual(countedFailure, {
    solved: false,
    logicErrors: 1,
    evidenceSupportMissing: 2,
    contradictionCount: 1,
  });
});

test("sanitizer migrates old saves missing every 2.0 field and cleans malformed additions", async () => {
  const { sanitizePersistedCaseState } = await loadModule("/store/case-store.ts");
  const fallback = {
    investigatorCode: "",
    bootSeen: false,
    runCount: 1,
    completedRuns: 0,
    completedPuzzles: [],
    unlockedEvidenceIds: ["ev-commission"],
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
    audio: { muted: false, volume: 0.42, ambient: true, interface: true },
    soundDegraded: false,
  };

  const migrated = sanitizePersistedCaseState({
    investigatorCode: "  LEGACY-7  ",
    completedPuzzles: ["schedule"],
    readEvidenceIds: ["ev-offset", "ev-commission"],
    evidenceVerdicts: { "ev-offset": "credible" },
  }, fallback);
  assert.equal(migrated.investigatorCode, "LEGACY-7");
  assert.deepEqual(migrated.completedPuzzles, ["schedule"]);
  assert.deepEqual(migrated.evidenceRelations, {});
  assert.deepEqual(migrated.evidenceReviewTouchedIds, []);
  assert.deepEqual(migrated.legacyVerifiedEvidenceIds, ["ev-offset"]);
  assert.deepEqual(migrated.taskProgress, {});

  const cleaned = sanitizePersistedCaseState({
    evidenceRelations: {
      "ev-offset": {
        supports: ["ev-cctv", "ev-cctv", "ev-offset"],
        contradicts: ["ev-cctv", "ev-phone", 7],
      },
    },
    evidenceReviewTouchedIds: ["ev-offset", 7],
    legacyVerifiedEvidenceIds: "ev-offset",
    taskProgress: {
      "restore-time": ["clock", 7],
      "repair-call": ["signal", "signal"],
      unknown: ["ignored"],
    },
  }, fallback);
  assert.deepEqual(cleaned.evidenceRelations, {
    "ev-offset": { supports: ["ev-cctv"], contradicts: [] },
  });
  assert.deepEqual(cleaned.evidenceReviewTouchedIds, []);
  assert.deepEqual(cleaned.legacyVerifiedEvidenceIds, []);
  assert.deepEqual(cleaned.taskProgress, { "repair-call": ["signal"] });
});
