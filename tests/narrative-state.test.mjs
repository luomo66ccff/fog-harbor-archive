import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const storageValues = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem(key) { return storageValues.get(key) ?? null; },
    setItem(key, value) { storageValues.set(key, String(value)); },
    removeItem(key) { storageValues.delete(key); },
  },
});

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
  storageValues.clear();
});

function narrativeContext(overrides = {}) {
  return {
    completedPuzzles: [],
    readDocumentIds: [],
    readEvidenceIds: [],
    discoveredAnonymous: false,
    provisionalTheory: {},
    theoryHistory: [],
    currentEnding: null,
    ...overrides,
  };
}

test("declares ten one-shot narrative events and returns only unseen triggered events", async () => {
  const {
    getNextNarrativeEvent,
    getPendingNarrativeEvents,
    isNarrativeEventId,
    narrativeEvents,
  } = await loadModule("/lib/narrative-engine.ts");

  assert.equal(narrativeEvents.length, 10);
  assert.equal(new Set(narrativeEvents.map((event) => event.id)).size, 10);
  assert.ok(narrativeEvents.every((event) => event.oneShot));
  assert.equal(isNarrativeEventId("theory-correction"), true);
  assert.equal(isNarrativeEventId("invented-event"), false);

  const firstContext = narrativeContext({
    readDocumentIds: ["doc-case", "doc-weather"],
  });
  assert.equal(getNextNarrativeEvent(firstContext, [])?.id, "first-time-contradiction");
  assert.deepEqual(getPendingNarrativeEvents(firstContext, ["first-time-contradiction"]), []);

  const scheduleContext = narrativeContext({ completedPuzzles: ["schedule"] });
  assert.equal(
    getNextNarrativeEvent(scheduleContext, ["first-time-contradiction"])?.id,
    "archive-watch-warning",
  );
  assert.equal(
    getNextNarrativeEvent(scheduleContext, ["first-time-contradiction", "archive-watch-warning"]),
    null,
    "the tape false lead must wait until the recording is actually repaired",
  );
  const frequencyContext = narrativeContext({ completedPuzzles: ["schedule", "frequency"] });
  assert.equal(
    getNextNarrativeEvent(frequencyContext, ["first-time-contradiction", "archive-watch-warning"])?.id,
    "xuwancheng-false-lead",
  );

  const correctionContext = narrativeContext({
    completedPuzzles: ["schedule", "frequency", "photo"],
    readEvidenceIds: ["ev-toolbox"],
    provisionalTheory: { secondFigure: "rescuer" },
    theoryHistory: ["pursuer", "pursuer->rescuer"],
  });
  assert.equal(getNextNarrativeEvent(correctionContext, [
    "first-time-contradiction",
    "archive-watch-warning",
    "xuwancheng-false-lead",
    "tape-edit-detected",
    "second-figure-theory",
  ])?.id, "theory-correction");
  assert.equal(getNextNarrativeEvent({ ...correctionContext, readEvidenceIds: [] }, [
    "first-time-contradiction",
    "archive-watch-warning",
    "xuwancheng-false-lead",
    "tape-edit-detected",
    "second-figure-theory",
  ]), null, "changing buttons alone is not evidence of a corrected theory");

  assert.equal(getNextNarrativeEvent(
    narrativeContext({ readEvidenceIds: ["ev-payment"] }),
    [],
  ), null, "the payment alone must not reveal its medical context");
  assert.equal(getNextNarrativeEvent(
    narrativeContext({ readEvidenceIds: ["ev-medical-context"] }),
    [],
  )?.id, "gu-weian-payment-context");

  assert.equal(getNextNarrativeEvent(
    narrativeContext({ currentEnding: "seventh" }),
    [],
  )?.id, "investigator-file-created");
  assert.equal(getNextNarrativeEvent(
    narrativeContext({ currentEnding: "seventh" }),
    ["investigator-file-created"],
  ), null);
});

test("easter egg helpers use forgiving ranges, preserve order, and record discoveries idempotently", async () => {
  const {
    getSevenStampCopy,
    getLampMorseCopy,
    isArchiveAcrosticSequence,
    isEasterEggId,
    isGhostChannelTuned,
    nextArchiveAcrosticTrail,
    recordEasterEggDiscovery,
  } = await loadModule("/lib/easter-egg-engine.ts");

  const ids = [
    "lamp-morse-0712",
    "seven-stamp",
    "mirror-map",
    "rain-trace",
    "archive-acrostic",
    "ghost-channel",
    "second-run-knock",
    "investigator-index",
  ];
  assert.ok(ids.every(isEasterEggId));
  assert.equal(isEasterEggId("mandatory-main-plot"), false);

  assert.equal(isGhostChannelTuned({ frozen: true, brightness: 50, contrast: 70 }), true);
  assert.equal(isGhostChannelTuned({ frozen: false, brightness: 50, contrast: 70 }), false);
  assert.equal(isGhostChannelTuned({ frozen: true, brightness: 37, contrast: 70 }), false);
  assert.equal(isGhostChannelTuned({ frozen: true, brightness: 50, contrast: 83 }), false);
  assert.equal(getSevenStampCopy(1), "第七码头不是第七个节点。");
  assert.equal(getSevenStampCopy(2), "你已经知道还有六个。");
  assert.match(getLampMorseCopy(1), /纸带口令一致/);
  assert.match(getLampMorseCopy(2), /等你回应/);

  assert.equal(isArchiveAcrosticSequence([
    "doc-case",
    "doc-weather",
    "doc-duty",
    "doc-extra",
    "doc-phone",
    "doc-port",
  ]), true);
  assert.equal(isArchiveAcrosticSequence([
    "doc-weather",
    "doc-phone",
    "doc-duty",
    "doc-port",
  ]), false);
  assert.deepEqual(nextArchiveAcrosticTrail([], "doc-weather"), ["doc-weather"]);
  assert.deepEqual(nextArchiveAcrosticTrail(["doc-weather"], "doc-duty"), ["doc-weather", "doc-duty"]);
  assert.deepEqual(nextArchiveAcrosticTrail(["doc-weather", "doc-duty"], "doc-case"), []);

  const once = recordEasterEggDiscovery([], "seven-stamp");
  const twice = recordEasterEggDiscovery(once, "seven-stamp");
  assert.deepEqual(once, ["seven-stamp"]);
  assert.deepEqual(twice, ["seven-stamp"]);
});

test("easter egg discoveries cannot change task or ending availability", async () => {
  const { getCurrentInvestigationTask } = await loadModule("/lib/progression-engine.ts");
  const { getEndingAvailability } = await loadModule("/lib/ending-engine.ts");
  const { useCaseStore } = await loadModule("/store/case-store.ts");
  const taskContext = { completedPuzzles: ["schedule", "frequency"], currentEnding: null, taskProgress: {} };
  const endingContext = {
    completedPuzzles: ["schedule", "frequency", "photo", "deduction"],
    unlockedEvidenceIds: [],
    readEvidenceIds: [],
    discoveredAnonymous: false,
  };
  const beforeTask = getCurrentInvestigationTask(taskContext).id;
  const beforeEndings = getEndingAvailability(endingContext);

  for (const id of [
    "lamp-morse-0712", "seven-stamp", "mirror-map", "rain-trace",
    "archive-acrostic", "ghost-channel", "second-run-knock", "investigator-index",
  ]) useCaseStore.getState().discoverEasterEgg(id);

  assert.equal(getCurrentInvestigationTask(taskContext).id, beforeTask);
  assert.deepEqual(getEndingAvailability(endingContext), beforeEndings);
});

test("truth, trade, and seventh ending gates remain independently reachable", async () => {
  const { evidence } = await loadModule("/lib/evidence-data.ts");
  const { getEndingAvailability } = await loadModule("/lib/ending-engine.ts");
  const criticalIds = evidence.filter((item) => item.critical).map((item) => item.id);
  const base = {
    unlockedEvidenceIds: criticalIds,
    readEvidenceIds: criticalIds,
    discoveredAnonymous: false,
  };

  assert.deepEqual(getEndingAvailability({ ...base, completedPuzzles: [] }), {
    truth: false,
    trade: false,
    seventh: false,
    critical: criticalIds.length,
  });
  const mainSolved = getEndingAvailability({ ...base, completedPuzzles: ["deduction"] });
  assert.equal(mainSolved.trade, true);
  assert.equal(mainSolved.truth, true);
  assert.equal(mainSolved.seventh, false);
  const allSolved = getEndingAvailability({
    ...base,
    completedPuzzles: ["deduction", "hidden"],
    discoveredAnonymous: true,
  });
  assert.equal(allSolved.truth, true);
  assert.equal(allSolved.trade, true);
  assert.equal(allSolved.seventh, true);
});

function persistedFallback() {
  return {
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
    seenNarrativeEvents: [],
    discoveredEasterEggs: [],
    provisionalTheory: {},
    theoryHistory: [],
    assistedInvestigation: false,
    runStartedAt: 123,
    audio: { muted: false, volume: 0.42, ambient: true, interface: true },
    soundDegraded: false,
  };
}

test("sanitizer migrates missing narrative fields and filters illegal or duplicate ids", async () => {
  const { sanitizePersistedCaseState } = await loadModule("/store/case-store.ts");
  const fallback = persistedFallback();

  const migrated = sanitizePersistedCaseState({
    investigatorCode: "LEGACY",
    completedPuzzles: ["schedule"],
  }, fallback);
  assert.equal(migrated.investigatorCode, "LEGACY");
  assert.deepEqual(migrated.completedPuzzles, ["schedule"]);
  assert.deepEqual(migrated.seenNarrativeEvents, []);
  assert.deepEqual(migrated.discoveredEasterEggs, []);
  assert.deepEqual(migrated.provisionalTheory, {});
  assert.deepEqual(migrated.theoryHistory, []);
  assert.equal(migrated.assistedInvestigation, false);
  assert.equal(migrated.runStartedAt, 123);

  const cleaned = sanitizePersistedCaseState({
    seenNarrativeEvents: [
      "first-time-contradiction",
      "invalid-event",
      "first-time-contradiction",
      7,
    ],
    discoveredEasterEggs: ["seven-stamp", "invalid-egg", "seven-stamp", null],
    provisionalTheory: { secondFigure: "culprit" },
    theoryHistory: ["pursuer", "culprit", "pursuer->rescuer", "rescuer->rescuer", 7],
    assistedInvestigation: "yes",
    runStartedAt: -1,
  }, fallback);
  assert.deepEqual(cleaned.seenNarrativeEvents, ["first-time-contradiction"]);
  assert.deepEqual(cleaned.discoveredEasterEggs, ["seven-stamp"]);
  assert.deepEqual(cleaned.provisionalTheory, {});
  assert.deepEqual(cleaned.theoryHistory, ["pursuer", "pursuer->rescuer"]);
  assert.equal(cleaned.assistedInvestigation, false);
  assert.equal(cleaned.runStartedAt, 123);
});

test("store records theory revisions, preserves collections across runs, and indexes seventh ending", async () => {
  const { useCaseStore } = await loadModule("/store/case-store.ts");
  const { useWindowStore } = await loadModule("/store/window-store.ts");
  useCaseStore.setState({
    seenNarrativeEvents: [],
    discoveredEasterEggs: [],
    provisionalTheory: {},
    theoryHistory: [],
    assistedInvestigation: false,
    runStartedAt: 1,
    runCount: 1,
    completedRuns: 0,
    currentEnding: null,
    endingsSeen: [],
  });

  useCaseStore.getState().markNarrativeEventSeen("first-time-contradiction");
  useCaseStore.getState().markNarrativeEventSeen("first-time-contradiction");
  useCaseStore.getState().discoverEasterEgg("seven-stamp");
  useCaseStore.getState().discoverEasterEgg("seven-stamp");
  useCaseStore.getState().setSecondFigureTheory("pursuer");
  useCaseStore.getState().setSecondFigureTheory("pursuer");
  useCaseStore.getState().setSecondFigureTheory("rescuer");
  useCaseStore.getState().setAssistedInvestigation(true);
  useWindowStore.getState().resetEasterEggSession();
  useWindowStore.getState().pressArchiveStamp();
  useWindowStore.getState().pressArchiveStamp();
  useWindowStore.getState().recordArchiveDocumentVisit("doc-weather");

  let state = useCaseStore.getState();
  assert.deepEqual(state.seenNarrativeEvents, ["first-time-contradiction"]);
  assert.deepEqual(state.discoveredEasterEggs, ["seven-stamp"]);
  assert.deepEqual(state.provisionalTheory, { secondFigure: "rescuer" });
  assert.deepEqual(state.theoryHistory, ["pursuer", "pursuer->rescuer"]);

  state.restartCase();
  state = useCaseStore.getState();
  assert.deepEqual(state.seenNarrativeEvents, ["first-time-contradiction"]);
  assert.deepEqual(state.discoveredEasterEggs, ["seven-stamp"]);
  assert.deepEqual(state.provisionalTheory, {});
  assert.deepEqual(state.theoryHistory, []);
  assert.equal(state.assistedInvestigation, true);
  assert.ok(state.runStartedAt > 1);
  assert.equal(useWindowStore.getState().archiveStampClicks, 2);
  assert.deepEqual(useWindowStore.getState().archiveAcrosticTrail, ["doc-weather"]);

  state.chooseEnding("seventh");
  state = useCaseStore.getState();
  assert.ok(state.seenNarrativeEvents.includes("investigator-file-created"));
  assert.ok(state.discoveredEasterEggs.includes("investigator-index"));

  state.clearAllProgress();
  state = useCaseStore.getState();
  assert.deepEqual(state.seenNarrativeEvents, []);
  assert.deepEqual(state.discoveredEasterEggs, []);
  assert.deepEqual(state.provisionalTheory, {});
  assert.deepEqual(state.theoryHistory, []);
  assert.equal(state.assistedInvestigation, false);
  assert.equal(useWindowStore.getState().archiveStampClicks, 0);
  assert.deepEqual(useWindowStore.getState().archiveAcrosticTrail, []);
});
