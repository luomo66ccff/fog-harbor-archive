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
    runNarrativeEventIds: [],
    discoveredEasterEggs: [],
    runDiscoveredEasterEggIds: [],
    seenCinematicEvents: [],
    ambientEventSeed: 123,
    seenAmbientEvents: [],
    provisionalTheory: {},
    theoryHistory: [],
    runMemory: {
      correctedTheoryBefore: false,
      endingsSeenAtRunStart: [],
      easterEggCountAtRunStart: 0,
    },
    assistedInvestigation: false,
    runStartedAt: 123,
    audio: { muted: false, volume: 0.42, ambient: true, interface: true },
    soundDegraded: false,
  };
}

test("migrates the legacy investigator event and waits for the ending screen to write the index", async () => {
  const {
    getNextNarrativeEvent,
    isNarrativeEventId,
    normalizeNarrativeEventId,
  } = await loadModule("/lib/narrative-engine.ts");
  const { sanitizePersistedCaseState, useCaseStore } = await loadModule("/store/case-store.ts");

  assert.equal(isNarrativeEventId("investigator-file-created"), false);
  assert.equal(normalizeNarrativeEventId("investigator-file-created"), "investigator-index-written");
  assert.equal(normalizeNarrativeEventId("not-real"), null);

  const migrated = sanitizePersistedCaseState({
    seenNarrativeEvents: [
      "investigator-file-created",
      "investigator-index-written",
      "not-real",
    ],
  }, persistedFallback());
  assert.deepEqual(migrated.seenNarrativeEvents, ["investigator-index-written"]);

  const endingContext = {
    completedPuzzles: [],
    readDocumentIds: [],
    readEvidenceIds: [],
    discoveredAnonymous: false,
    provisionalTheory: {},
    theoryHistory: [],
    currentEnding: "seventh",
  };
  assert.equal(getNextNarrativeEvent(endingContext, []), null);

  useCaseStore.setState({
    currentEnding: null,
    completedRuns: 0,
    endingsSeen: [],
    seenNarrativeEvents: [],
    discoveredEasterEggs: [],
  });
  useCaseStore.getState().chooseEnding("seventh");
  assert.deepEqual(useCaseStore.getState().seenNarrativeEvents, []);
  assert.deepEqual(useCaseStore.getState().discoveredEasterEggs, []);

  useCaseStore.getState().markNarrativeEventSeen("investigator-index-written");
  useCaseStore.getState().discoverEasterEgg("investigator-index");
  assert.deepEqual(useCaseStore.getState().seenNarrativeEvents, ["investigator-index-written"]);
  assert.deepEqual(useCaseStore.getState().discoveredEasterEggs, ["investigator-index"]);
});

test("migrates, snapshots, and clears run memory at run boundaries", async () => {
  const { nextAmbientSeed } = await loadModule("/lib/ambient-event-engine.ts");
  const { sanitizePersistedCaseState, useCaseStore } = await loadModule("/store/case-store.ts");
  const fallback = persistedFallback();

  const migrated = sanitizePersistedCaseState({
    theoryHistory: ["pursuer", "pursuer->rescuer"],
    endingsSeen: ["truth"],
    discoveredEasterEggs: ["seven-stamp", "mirror-map"],
    completedPuzzles: ["schedule"],
  }, fallback);
  assert.deepEqual(migrated.runMemory, {
    correctedTheoryBefore: true,
    endingsSeenAtRunStart: ["truth"],
    easterEggCountAtRunStart: 2,
  });
  assert.deepEqual(migrated.seenCinematicEvents, ["time-restored", "theory-corrected"]);

  const seed = 0x12345678;
  useCaseStore.setState({
    runMemory: {
      correctedTheoryBefore: false,
      endingsSeenAtRunStart: [],
      easterEggCountAtRunStart: 0,
    },
    theoryHistory: ["pursuer", "pursuer->rescuer"],
    endingsSeen: ["trade", "truth"],
    discoveredEasterEggs: ["seven-stamp", "mirror-map"],
    seenNarrativeEvents: ["external-reader-detected"],
    runNarrativeEventIds: ["external-reader-detected"],
    runDiscoveredEasterEggIds: ["seven-stamp", "mirror-map"],
    seenCinematicEvents: ["photo-restored"],
    ambientEventSeed: seed,
    seenAmbientEvents: ["four-note-horn"],
  });

  useCaseStore.getState().restartCase();
  let state = useCaseStore.getState();
  assert.deepEqual(state.runMemory, {
    correctedTheoryBefore: true,
    endingsSeenAtRunStart: ["trade", "truth"],
    easterEggCountAtRunStart: 2,
  });
  assert.deepEqual(state.seenCinematicEvents, ["external-reader"]);
  assert.deepEqual(state.seenAmbientEvents, []);
  assert.deepEqual(state.runNarrativeEventIds, []);
  assert.deepEqual(state.runDiscoveredEasterEggIds, []);
  assert.equal(state.ambientEventSeed, nextAmbientSeed(seed));

  state.clearAllProgress();
  state = useCaseStore.getState();
  assert.deepEqual(state.runMemory, {
    correctedTheoryBefore: false,
    endingsSeenAtRunStart: [],
    easterEggCountAtRunStart: 0,
  });
  assert.deepEqual(state.seenCinematicEvents, []);
  assert.deepEqual(state.seenAmbientEvents, []);
  assert.deepEqual(state.runNarrativeEventIds, []);
  assert.deepEqual(state.runDiscoveredEasterEggIds, []);
});

test("stores narrative and hidden discoveries as honest per-run deltas", async () => {
  const { useCaseStore } = await loadModule("/store/case-store.ts");
  useCaseStore.setState({
    runCount: 1,
    completedRuns: 0,
    runHistory: [],
    currentEnding: null,
    seenNarrativeEvents: [],
    runNarrativeEventIds: [],
    discoveredEasterEggs: [],
    runDiscoveredEasterEggIds: [],
    runStartedAt: Date.UTC(2019, 6, 12, 2, 17),
  });
  useCaseStore.getState().markNarrativeEventSeen("first-time-contradiction");
  useCaseStore.getState().discoverEasterEgg("seven-stamp");
  useCaseStore.getState().chooseEnding("truth");
  useCaseStore.getState().restartCase();

  let state = useCaseStore.getState();
  assert.deepEqual(state.runNarrativeEventIds, []);
  assert.deepEqual(state.runDiscoveredEasterEggIds, []);
  useCaseStore.getState().markNarrativeEventSeen("theory-correction");
  useCaseStore.getState().discoverEasterEgg("mirror-map");
  useCaseStore.getState().chooseEnding("trade");
  state = useCaseStore.getState();

  assert.deepEqual(state.runHistory.map((run) => run.narrativeEventIds), [
    ["first-time-contradiction"],
    ["theory-correction"],
  ]);
  assert.deepEqual(state.runHistory.map((run) => run.discoveredEasterEggIds), [
    ["seven-stamp"],
    ["mirror-map"],
  ]);
});

test("defines nine skippable one-shot cinematics with deterministic reduced-motion presentations", async () => {
  const {
    cinematicEventIds,
    cinematicEvents,
    deriveSeenCinematicEvents,
    getCinematicPresentation,
    getPendingCinematicEvents,
    isCinematicEventId,
  } = await loadModule("/lib/cinematic-engine.ts");

  assert.deepEqual(cinematicEventIds, [
    "time-restored",
    "tape-signal-locked",
    "photo-restored",
    "theory-corrected",
    "chain-closed",
    "external-reader",
    "ending-truth",
    "ending-trade",
    "ending-seventh",
  ]);
  assert.equal(cinematicEvents.length, 9);
  assert.equal(new Set(cinematicEvents.map((event) => event.id)).size, 9);
  assert.ok(cinematicEventIds.every(isCinematicEventId));
  assert.equal(isCinematicEventId("ending-invented"), false);
  assert.ok(cinematicEvents.every((event) => (
    event.oneShot
      && event.skippable
      && event.durationMs >= 1_500
      && event.durationMs <= 4_000
      && event.environment.description.length > 0
      && event.caption.length > 0
      && event.reducedMotion.mode === "static"
      && event.reducedMotion.environment === "none"
      && event.reducedMotion.pulse === "none"
  )));

  const context = {
    completedPuzzles: ["schedule", "frequency", "photo", "deduction"],
    theoryHistory: ["pursuer", "pursuer->rescuer"],
    seenNarrativeEvents: ["external-reader-detected"],
    currentEnding: "truth",
  };
  const pending = getPendingCinematicEvents(context, []);
  assert.deepEqual(pending.map((event) => event.id), [
    "time-restored",
    "tape-signal-locked",
    "photo-restored",
    "theory-corrected",
    "chain-closed",
    "external-reader",
    "ending-truth",
  ]);
  assert.deepEqual(
    getPendingCinematicEvents(context, pending.map((event) => event.id)),
    [],
    "seen one-shot cinematics must not be returned twice in a run",
  );
  assert.deepEqual(deriveSeenCinematicEvents(context), pending.map((event) => event.id));
  assert.equal(getCinematicPresentation(pending[0], true), pending[0].reducedMotion);
  assert.equal(getCinematicPresentation(pending[0], false), pending[0]);

  for (const endingId of ["truth", "trade", "seventh"]) {
    const endingOnly = getPendingCinematicEvents({
      completedPuzzles: [],
      theoryHistory: [],
      seenNarrativeEvents: [],
      currentEnding: endingId,
    }, []);
    assert.deepEqual(endingOnly.map((event) => event.id), [`ending-${endingId}`]);
  }
});

test("selects at most two seeded ambient events and sanitizes every new persisted field", async () => {
  const {
    ambientEventIds,
    ambientEvents,
    getAmbientEventDelay,
    getPendingAmbientEvents,
    MAX_AMBIENT_EVENTS_PER_RUN,
    selectAmbientEventsForRun,
  } = await loadModule("/lib/ambient-event-engine.ts");
  const { sanitizePersistedCaseState, useCaseStore } = await loadModule("/store/case-store.ts");

  assert.ok(ambientEvents.length >= 6 && ambientEvents.length <= 10);
  assert.equal(new Set(ambientEventIds).size, ambientEvents.length);
  assert.ok(ambientEvents.every((event) => (
    event.minDelayMs >= 60_000
      && event.maxDelayMs >= event.minDelayMs
      && event.reducedMotion.mode === "static"
      && event.reducedMotion.text.length > 0
  )));
  const allowedKeys = new Set([
    "id",
    "effect",
    "text",
    "minDelayMs",
    "maxDelayMs",
    "requiresPuzzle",
    "reducedMotion",
  ]);
  assert.ok(ambientEvents.every((event) => Object.keys(event).every((key) => allowedKeys.has(key))));

  const completedPuzzles = ["schedule", "frequency", "photo", "deduction", "hidden"];
  const first = selectAmbientEventsForRun(0x0712, completedPuzzles);
  const repeated = selectAmbientEventsForRun(0x0712, completedPuzzles);
  assert.deepEqual(first.map((event) => event.id), repeated.map((event) => event.id));
  assert.ok(first.length <= MAX_AMBIENT_EVENTS_PER_RUN);
  assert.equal(new Set(first.map((event) => event.id)).size, first.length);
  for (const event of first) {
    const delay = getAmbientEventDelay(0x0712, event);
    assert.equal(delay, getAmbientEventDelay(0x0712, event));
    assert.ok(delay >= event.minDelayMs && delay <= event.maxDelayMs);
  }
  assert.deepEqual(
    getPendingAmbientEvents(0x0712, {
      completedPuzzles,
      seenAmbientEvents: [first[0].id],
    }).map((event) => event.id),
    first.slice(1).map((event) => event.id),
  );
  assert.deepEqual(getPendingAmbientEvents(0x0712, {
    completedPuzzles,
    seenAmbientEvents: first.map((event) => event.id),
  }), []);

  const cleaned = sanitizePersistedCaseState({
    seenNarrativeEvents: ["investigator-file-created", "bad-event"],
    seenCinematicEvents: ["time-restored", "bad-cinematic", "time-restored"],
    ambientEventSeed: -5,
    seenAmbientEvents: [
      "phantom-unread-count",
      "bad-ambient",
      "four-note-horn",
      "session-date-echo",
    ],
    runMemory: {
      correctedTheoryBefore: "yes",
      endingsSeenAtRunStart: ["truth", "bad-ending"],
      easterEggCountAtRunStart: 999,
    },
  }, persistedFallback());
  assert.deepEqual(cleaned.seenNarrativeEvents, ["investigator-index-written"]);
  assert.deepEqual(cleaned.seenCinematicEvents, ["time-restored"]);
  assert.equal(cleaned.ambientEventSeed, 123);
  assert.deepEqual(cleaned.seenAmbientEvents, ["phantom-unread-count", "four-note-horn"]);
  assert.deepEqual(cleaned.runMemory, persistedFallback().runMemory);

  useCaseStore.setState({ seenAmbientEvents: [] });
  for (const id of ambientEventIds.slice(0, 3)) useCaseStore.getState().markAmbientEventSeen(id);
  assert.equal(useCaseStore.getState().seenAmbientEvents.length, MAX_AMBIENT_EVENTS_PER_RUN);
});
