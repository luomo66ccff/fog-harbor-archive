"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  EndingId,
  InvestigationTaskId,
  PuzzleId,
  TaskProgress,
  UnlockEventId,
} from "@/types/case";
import type { EvidenceRelationKind, EvidenceRelations, EvidenceVerdict } from "@/types/evidence";
import type {
  AmbientEventId,
  CinematicEventId,
  EasterEggId,
  NarrativeEventId,
  NarrativeState,
  ProvisionalTheoryState,
  RunMemory,
  SecondFigureTheory,
} from "@/types/narrative";
import { evidence, initialEvidenceIds, puzzleRewards } from "@/lib/evidence-data";
import { isEasterEggId, recordEasterEggDiscovery } from "@/lib/easter-egg-engine";
import {
  normalizeNarrativeEventId,
} from "@/lib/narrative-engine";
import {
  deriveSeenCinematicEvents,
  isCinematicEventId,
} from "@/lib/cinematic-engine";
import {
  isAmbientEventId,
  MAX_AMBIENT_EVENTS_PER_RUN,
  nextAmbientSeed,
  normalizeAmbientSeed,
} from "@/lib/ambient-event-engine";
import { useWindowStore } from "@/store/window-store";
import type { InvestigationRunSnapshot } from "@/lib/investigation-log";

export const SAVE_KEY = "fog-harbor-save-v1";

export interface AudioSettings {
  muted: boolean;
  volume: number;
  ambient: boolean;
  interface: boolean;
}

interface CaseState extends NarrativeState {
  hydrated: boolean;
  investigatorCode: string;
  bootSeen: boolean;
  runCount: number;
  completedRuns: number;
  runHistory: InvestigationRunSnapshot[];
  runEndedAt: number | null;
  completedPuzzles: PuzzleId[];
  unlockedEvidenceIds: string[];
  readDocumentIds: string[];
  readMessageIds: string[];
  readEvidenceIds: string[];
  evidenceVerdicts: Record<string, EvidenceVerdict>;
  evidenceNotes: Record<string, string>;
  evidenceRelations: EvidenceRelations;
  evidenceReviewTouchedIds: string[];
  legacyVerifiedEvidenceIds: string[];
  caseNote: string;
  discoveredAnonymous: boolean;
  currentEnding: EndingId | null;
  endingsSeen: EndingId[];
  puzzleAttempts: Partial<Record<PuzzleId, number>>;
  taskProgress: TaskProgress;
  audio: AudioSettings;
  soundDegraded: boolean;
  unlockQueue: UnlockEventId[];
  /** @deprecated Read unlockQueue instead. Kept until the desktop toast is migrated. */
  lastUnlock: string | null;
  setHydrated: (value: boolean) => void;
  setInvestigatorCode: (code: string) => void;
  markBootSeen: () => void;
  markDocumentRead: (id: string) => void;
  markMessageRead: (id: string) => void;
  markEvidenceRead: (id: string) => void;
  setEvidenceVerdict: (id: string, verdict: EvidenceVerdict) => void;
  toggleEvidenceRelation: (id: string, relatedId: string, relation: EvidenceRelationKind) => void;
  setEvidenceNote: (id: string, note: string) => void;
  setCaseNote: (note: string) => void;
  recordAttempt: (id: PuzzleId) => void;
  markTaskProgress: (taskId: InvestigationTaskId, itemId: string) => void;
  markNarrativeEventSeen: (id: NarrativeEventId) => void;
  markCinematicEventSeen: (id: CinematicEventId) => void;
  markAmbientEventSeen: (id: AmbientEventId) => void;
  discoverEasterEgg: (id: EasterEggId) => void;
  setSecondFigureTheory: (value: SecondFigureTheory) => void;
  setAssistedInvestigation: (value: boolean) => void;
  completePuzzle: (id: PuzzleId) => void;
  identifyAnonymous: () => void;
  chooseEnding: (id: EndingId) => void;
  dismissUnlock: () => void;
  dismissUnlockNotification: (id?: UnlockEventId) => void;
  updateAudio: (settings: Partial<AudioSettings>) => void;
  setSoundDegraded: (value: boolean) => void;
  restartCase: () => void;
  clearAllProgress: () => void;
}

export type PersistedCaseState = Pick<
  CaseState,
  | "investigatorCode"
  | "bootSeen"
  | "runCount"
  | "completedRuns"
  | "runHistory"
  | "runEndedAt"
  | "completedPuzzles"
  | "unlockedEvidenceIds"
  | "readDocumentIds"
  | "readMessageIds"
  | "readEvidenceIds"
  | "evidenceVerdicts"
  | "evidenceNotes"
  | "evidenceRelations"
  | "evidenceReviewTouchedIds"
  | "legacyVerifiedEvidenceIds"
  | "caseNote"
  | "discoveredAnonymous"
  | "currentEnding"
  | "endingsSeen"
  | "puzzleAttempts"
  | "taskProgress"
  | "seenNarrativeEvents"
  | "runNarrativeEventIds"
  | "discoveredEasterEggs"
  | "runDiscoveredEasterEggIds"
  | "seenCinematicEvents"
  | "ambientEventSeed"
  | "seenAmbientEvents"
  | "provisionalTheory"
  | "theoryHistory"
  | "runMemory"
  | "assistedInvestigation"
  | "runStartedAt"
  | "audio"
  | "soundDegraded"
>;

const puzzleIds = new Set<PuzzleId>(["schedule", "frequency", "photo", "deduction", "hidden"]);
const endingIds = new Set<EndingId>(["truth", "trade", "seventh"]);
const evidenceVerdicts = new Set<EvidenceVerdict>(["unmarked", "credible", "doubtful", "forged"]);
const criticalEvidenceIds = new Set(evidence.filter((item) => item.critical).map((item) => item.id));
const MAX_DATE_MS = 8_640_000_000_000_000;
const investigationTaskIds = new Set<InvestigationTaskId>([
  "restore-time",
  "repair-call",
  "reconstruct-photo",
  "close-chain",
  "review-finale",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPuzzleId(value: unknown): value is PuzzleId {
  return typeof value === "string" && puzzleIds.has(value as PuzzleId);
}

function isEndingId(value: unknown): value is EndingId {
  return typeof value === "string" && endingIds.has(value as EndingId);
}

function stringArrayOr(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? unique(value)
    : [...fallback];
}

function puzzleArrayOr(value: unknown, fallback: PuzzleId[]): PuzzleId[] {
  return Array.isArray(value) && value.every(isPuzzleId)
    ? Array.from(new Set(value))
    : [...fallback];
}

function endingArrayOr(value: unknown, fallback: EndingId[]): EndingId[] {
  return Array.isArray(value) && value.every(isEndingId)
    ? Array.from(new Set(value))
    : [...fallback];
}

function narrativeEventArrayOr(value: unknown, fallback: NarrativeEventId[] = []): NarrativeEventId[] {
  if (!Array.isArray(value)) return [...fallback];
  return unique(
    value
      .map(normalizeNarrativeEventId)
      .filter((id): id is NarrativeEventId => id !== null),
  );
}

function easterEggArrayOr(value: unknown, fallback: EasterEggId[] = []): EasterEggId[] {
  return Array.isArray(value)
    ? unique(value.filter(isEasterEggId))
    : [...fallback];
}

function cinematicEventArrayOr(
  value: unknown,
  fallback: CinematicEventId[] = [],
): CinematicEventId[] {
  return Array.isArray(value)
    ? unique(value.filter(isCinematicEventId))
    : [...fallback];
}

function ambientEventArrayOr(
  value: unknown,
  fallback: AmbientEventId[] = [],
): AmbientEventId[] {
  return Array.isArray(value)
    ? unique(value.filter(isAmbientEventId)).slice(0, MAX_AMBIENT_EVENTS_PER_RUN)
    : [...fallback].slice(0, MAX_AMBIENT_EVENTS_PER_RUN);
}

function isSecondFigureTheory(value: unknown): value is SecondFigureTheory {
  return value === "pursuer" || value === "rescuer" || value === "unknown";
}

function isTheoryHistoryEntry(value: unknown): value is string {
  if (isSecondFigureTheory(value)) return true;
  if (typeof value !== "string") return false;
  const [before, after, extra] = value.split("->");
  return extra === undefined
    && isSecondFigureTheory(before)
    && isSecondFigureTheory(after)
    && before !== after;
}

function provisionalTheoryOr(
  value: unknown,
  fallback: ProvisionalTheoryState = {},
): ProvisionalTheoryState {
  if (!isRecord(value)) return { ...fallback };
  return isSecondFigureTheory(value.secondFigure)
    ? { secondFigure: value.secondFigure }
    : {};
}

function theoryHistoryOr(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter(isTheoryHistoryEntry).slice(-64);
}

function hasTheoryCorrection(history: readonly string[]): boolean {
  return history.some((entry) => entry.includes("->"));
}

function runMemoryOr(
  value: unknown,
  fallback: RunMemory | undefined,
  legacyState: {
    theoryHistory: readonly string[];
    endingsSeen: readonly EndingId[];
    discoveredEasterEggs: readonly EasterEggId[];
  },
): RunMemory {
  const baseline = fallback ?? {
    correctedTheoryBefore: false,
    endingsSeenAtRunStart: [],
    easterEggCountAtRunStart: 0,
  };
  if (!isRecord(value)) {
    return {
      correctedTheoryBefore: hasTheoryCorrection(legacyState.theoryHistory),
      endingsSeenAtRunStart: [...legacyState.endingsSeen],
      easterEggCountAtRunStart: legacyState.discoveredEasterEggs.length,
    };
  }

  return {
    correctedTheoryBefore: typeof value.correctedTheoryBefore === "boolean"
      ? value.correctedTheoryBefore
      : baseline.correctedTheoryBefore,
    endingsSeenAtRunStart: endingArrayOr(
      value.endingsSeenAtRunStart,
      baseline.endingsSeenAtRunStart,
    ),
    easterEggCountAtRunStart: typeof value.easterEggCountAtRunStart === "number"
      && Number.isInteger(value.easterEggCountAtRunStart)
      && value.easterEggCountAtRunStart >= 0
      && value.easterEggCountAtRunStart <= 8
      ? value.easterEggCountAtRunStart
      : baseline.easterEggCountAtRunStart,
  };
}

function ambientEventSeedOr(value: unknown, fallback: number): number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0
    && value <= 0xffff_ffff
    ? normalizeAmbientSeed(value)
    : normalizeAmbientSeed(fallback);
}

function runStartedAtOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= MAX_DATE_MS
    ? value
    : fallback;
}

function runEndedAtOr(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= MAX_DATE_MS
    ? value
    : fallback;
}

function verdictRecordOr(value: unknown, fallback: Record<string, EvidenceVerdict>): Record<string, EvidenceVerdict> {
  if (!isRecord(value)) return { ...fallback };
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, EvidenceVerdict] => evidenceVerdicts.has(entry[1] as EvidenceVerdict)),
  );
}

function stringRecordOr(value: unknown, fallback: Record<string, string>): Record<string, string> {
  if (!isRecord(value)) return { ...fallback };
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function runHistoryOr(
  value: unknown,
  fallback: InvestigationRunSnapshot[] = [],
): InvestigationRunSnapshot[] {
  if (!Array.isArray(value)) return fallback.map((run) => ({ ...run, evidenceNotes: { ...run.evidenceNotes } }));
  const sanitized: InvestigationRunSnapshot[] = [];
  for (const item of value.slice(-20)) {
    if (!isRecord(item)) continue;
    const runNumber = typeof item.runNumber === "number" && Number.isInteger(item.runNumber) && item.runNumber >= 1
      ? item.runNumber
      : null;
    const startedAt = typeof item.startedAt === "number" && Number.isFinite(item.startedAt) && item.startedAt > 0 && item.startedAt <= MAX_DATE_MS
      ? item.startedAt
      : null;
    if (runNumber === null || startedAt === null) continue;
    const endingId = item.endingId === null || isEndingId(item.endingId) ? item.endingId : null;
    const discoveredIds = easterEggArrayOr(item.discoveredEasterEggIds);
    sanitized.push({
      runNumber,
      startedAt,
      endedAt: typeof item.endedAt === "number" && Number.isFinite(item.endedAt) && item.endedAt >= startedAt && item.endedAt <= MAX_DATE_MS
        ? item.endedAt
        : undefined,
      completedPuzzles: puzzleArrayOr(item.completedPuzzles, []),
      unlockedEvidenceIds: stringArrayOr(item.unlockedEvidenceIds),
      readDocumentIds: stringArrayOr(item.readDocumentIds),
      readMessageIds: stringArrayOr(item.readMessageIds),
      readEvidenceIds: stringArrayOr(item.readEvidenceIds),
      evidenceNotes: stringRecordOr(item.evidenceNotes, {}),
      caseNote: typeof item.caseNote === "string" ? item.caseNote.slice(0, 24_000) : "",
      puzzleAttempts: puzzleAttemptsOr(item.puzzleAttempts, {}),
      narrativeEventIds: narrativeEventArrayOr(item.narrativeEventIds),
      theoryHistory: theoryHistoryOr(item.theoryHistory),
      discoveredEasterEggCount: typeof item.discoveredEasterEggCount === "number" && Number.isInteger(item.discoveredEasterEggCount)
        ? Math.max(0, Math.min(8, item.discoveredEasterEggCount))
        : discoveredIds.length,
      discoveredEasterEggIds: discoveredIds,
      assistedInvestigation: item.assistedInvestigation === true,
      endingId,
    });
  }
  const byRun = new Map<number, InvestigationRunSnapshot>();
  sanitized.forEach((run) => byRun.set(run.runNumber, run));
  return [...byRun.values()].sort((left, right) => left.runNumber - right.runNumber).slice(-20);
}

function evidenceRelationsOr(value: unknown, fallback: EvidenceRelations = {}): EvidenceRelations {
  if (!isRecord(value)) return structuredCloneRelations(fallback);
  const relations: EvidenceRelations = {};
  for (const [evidenceId, selection] of Object.entries(value)) {
    if (!isRecord(selection)) continue;
    const supports = Array.isArray(selection.supports) && selection.supports.every((id) => typeof id === "string")
      ? unique(selection.supports.filter((id) => id !== evidenceId))
      : [];
    const contradicts = Array.isArray(selection.contradicts) && selection.contradicts.every((id) => typeof id === "string")
      ? unique(selection.contradicts.filter((id) => id !== evidenceId && !supports.includes(id)))
      : [];
    relations[evidenceId] = { supports, contradicts };
  }
  return relations;
}

function structuredCloneRelations(relations: EvidenceRelations = {}): EvidenceRelations {
  return Object.fromEntries(
    Object.entries(relations).map(([id, selection]) => [id, {
      supports: [...selection.supports],
      contradicts: [...selection.contradicts],
    }]),
  );
}

function puzzleAttemptsOr(
  value: unknown,
  fallback: Partial<Record<PuzzleId, number>>,
): Partial<Record<PuzzleId, number>> {
  if (!isRecord(value)) return { ...fallback };
  const attempts: Partial<Record<PuzzleId, number>> = {};
  for (const [key, count] of Object.entries(value)) {
    if (isPuzzleId(key) && typeof count === "number" && Number.isInteger(count) && count >= 0) attempts[key] = count;
  }
  return attempts;
}

function cloneTaskProgress(progress: TaskProgress | undefined): TaskProgress {
  if (!progress) return {};
  return Object.fromEntries(
    Object.entries(progress).map(([taskId, itemIds]) => [taskId, [...(itemIds ?? [])]]),
  ) as TaskProgress;
}

function taskProgressOr(value: unknown, fallback?: TaskProgress): TaskProgress {
  if (!isRecord(value)) return cloneTaskProgress(fallback);
  const progress: TaskProgress = {};
  for (const [taskId, itemIds] of Object.entries(value)) {
    if (!investigationTaskIds.has(taskId as InvestigationTaskId)) continue;
    if (!Array.isArray(itemIds) || !itemIds.every((item) => typeof item === "string")) continue;
    progress[taskId as InvestigationTaskId] = unique(itemIds);
  }
  return progress;
}

function audioSettingsOr(value: unknown, fallback: AudioSettings): AudioSettings {
  const source = isRecord(value) ? value : {};
  return {
    muted: typeof source.muted === "boolean" ? source.muted : fallback.muted,
    volume: typeof source.volume === "number" && Number.isFinite(source.volume) && source.volume >= 0 && source.volume <= 1
      ? source.volume
      : fallback.volume,
    ambient: typeof source.ambient === "boolean" ? source.ambient : fallback.ambient,
    interface: typeof source.interface === "boolean" ? source.interface : fallback.interface,
  };
}

function persistedSnapshot(state: CaseState): PersistedCaseState {
  return {
    investigatorCode: state.investigatorCode,
    bootSeen: state.bootSeen,
    runCount: state.runCount,
    completedRuns: state.completedRuns,
    runHistory: state.runHistory,
    runEndedAt: state.runEndedAt,
    completedPuzzles: state.completedPuzzles,
    unlockedEvidenceIds: state.unlockedEvidenceIds,
    readDocumentIds: state.readDocumentIds,
    readMessageIds: state.readMessageIds,
    readEvidenceIds: state.readEvidenceIds,
    evidenceVerdicts: state.evidenceVerdicts,
    evidenceNotes: state.evidenceNotes,
    evidenceRelations: state.evidenceRelations,
    evidenceReviewTouchedIds: state.evidenceReviewTouchedIds,
    legacyVerifiedEvidenceIds: state.legacyVerifiedEvidenceIds,
    caseNote: state.caseNote,
    discoveredAnonymous: state.discoveredAnonymous,
    currentEnding: state.currentEnding,
    endingsSeen: state.endingsSeen,
    puzzleAttempts: state.puzzleAttempts,
    taskProgress: state.taskProgress,
    seenNarrativeEvents: state.seenNarrativeEvents,
    runNarrativeEventIds: state.runNarrativeEventIds,
    discoveredEasterEggs: state.discoveredEasterEggs,
    runDiscoveredEasterEggIds: state.runDiscoveredEasterEggIds,
    seenCinematicEvents: state.seenCinematicEvents,
    ambientEventSeed: state.ambientEventSeed,
    seenAmbientEvents: state.seenAmbientEvents,
    provisionalTheory: state.provisionalTheory,
    theoryHistory: state.theoryHistory,
    runMemory: state.runMemory,
    assistedInvestigation: state.assistedInvestigation,
    runStartedAt: state.runStartedAt,
    audio: state.audio,
    soundDegraded: state.soundDegraded,
  };
}

export function sanitizePersistedCaseState(
  persistedState: unknown,
  fallback: PersistedCaseState,
): PersistedCaseState {
  const source = isRecord(persistedState) ? persistedState : {};
  const readEvidenceIds = stringArrayOr(source.readEvidenceIds, fallback.readEvidenceIds);
  const hasReviewState = Object.prototype.hasOwnProperty.call(source, "evidenceReviewTouchedIds")
    || Object.prototype.hasOwnProperty.call(source, "legacyVerifiedEvidenceIds")
    || Object.prototype.hasOwnProperty.call(source, "evidenceRelations");
  const completedPuzzles = puzzleArrayOr(source.completedPuzzles, fallback.completedPuzzles);
  const currentEnding = source.currentEnding === null || isEndingId(source.currentEnding)
    ? source.currentEnding
    : fallback.currentEnding;
  const endingsSeen = endingArrayOr(source.endingsSeen, fallback.endingsSeen);
  const runCount = typeof source.runCount === "number" && Number.isInteger(source.runCount) && source.runCount >= 1
    ? source.runCount
    : fallback.runCount;
  const runHistory = runHistoryOr(source.runHistory, fallback.runHistory ?? []);
  const seenNarrativeEvents = narrativeEventArrayOr(
    source.seenNarrativeEvents,
    fallback.seenNarrativeEvents,
  );
  const discoveredEasterEggs = easterEggArrayOr(
    source.discoveredEasterEggs,
    fallback.discoveredEasterEggs,
  );
  const theoryHistory = theoryHistoryOr(source.theoryHistory, fallback.theoryHistory);
  const sanitizedCinematicEvents = Object.prototype.hasOwnProperty.call(source, "seenCinematicEvents")
    ? cinematicEventArrayOr(source.seenCinematicEvents, fallback.seenCinematicEvents)
    : deriveSeenCinematicEvents({
      completedPuzzles,
      theoryHistory,
      seenNarrativeEvents,
      currentEnding,
    });
  const seenCinematicEvents = unique([
    ...sanitizedCinematicEvents,
    ...(runCount >= 2 && seenNarrativeEvents.includes("external-reader-detected")
      ? ["external-reader" as const]
      : []),
  ]);
  const runNarrativeEventIds = Object.prototype.hasOwnProperty.call(source, "runNarrativeEventIds")
    ? narrativeEventArrayOr(source.runNarrativeEventIds, fallback.runNarrativeEventIds ?? [])
    : (runHistory.length === 0 ? [...seenNarrativeEvents] : []);
  const runDiscoveredEasterEggIds = Object.prototype.hasOwnProperty.call(source, "runDiscoveredEasterEggIds")
    ? easterEggArrayOr(source.runDiscoveredEasterEggIds, fallback.runDiscoveredEasterEggIds ?? [])
    : (runHistory.length === 0 ? [...discoveredEasterEggs] : []);
  return {
    investigatorCode: typeof source.investigatorCode === "string"
      ? source.investigatorCode.trim().slice(0, 18)
      : fallback.investigatorCode,
    bootSeen: typeof source.bootSeen === "boolean" ? source.bootSeen : fallback.bootSeen,
    runCount,
    completedRuns: typeof source.completedRuns === "number" && Number.isInteger(source.completedRuns) && source.completedRuns >= 0
      ? source.completedRuns
      : fallback.completedRuns,
    runHistory,
    runEndedAt: runEndedAtOr(source.runEndedAt, fallback.runEndedAt ?? null),
    completedPuzzles,
    unlockedEvidenceIds: stringArrayOr(source.unlockedEvidenceIds, fallback.unlockedEvidenceIds),
    readDocumentIds: stringArrayOr(source.readDocumentIds, fallback.readDocumentIds),
    readMessageIds: stringArrayOr(source.readMessageIds, fallback.readMessageIds),
    readEvidenceIds,
    evidenceVerdicts: verdictRecordOr(source.evidenceVerdicts, fallback.evidenceVerdicts),
    evidenceNotes: stringRecordOr(source.evidenceNotes, fallback.evidenceNotes),
    evidenceRelations: evidenceRelationsOr(source.evidenceRelations, fallback.evidenceRelations),
    evidenceReviewTouchedIds: stringArrayOr(source.evidenceReviewTouchedIds, fallback.evidenceReviewTouchedIds),
    legacyVerifiedEvidenceIds: hasReviewState
      ? stringArrayOr(source.legacyVerifiedEvidenceIds, fallback.legacyVerifiedEvidenceIds)
      : readEvidenceIds.filter((id) => criticalEvidenceIds.has(id)),
    caseNote: typeof source.caseNote === "string" ? source.caseNote : fallback.caseNote,
    discoveredAnonymous: typeof source.discoveredAnonymous === "boolean" ? source.discoveredAnonymous : fallback.discoveredAnonymous,
    currentEnding,
    endingsSeen,
    puzzleAttempts: puzzleAttemptsOr(source.puzzleAttempts, fallback.puzzleAttempts),
    taskProgress: taskProgressOr(source.taskProgress, fallback.taskProgress),
    seenNarrativeEvents,
    runNarrativeEventIds,
    discoveredEasterEggs,
    runDiscoveredEasterEggIds,
    seenCinematicEvents,
    ambientEventSeed: ambientEventSeedOr(source.ambientEventSeed, fallback.ambientEventSeed),
    seenAmbientEvents: ambientEventArrayOr(source.seenAmbientEvents, fallback.seenAmbientEvents),
    provisionalTheory: provisionalTheoryOr(source.provisionalTheory, fallback.provisionalTheory),
    theoryHistory,
    runMemory: runMemoryOr(source.runMemory, fallback.runMemory, {
      theoryHistory,
      endingsSeen,
      discoveredEasterEggs,
    }),
    assistedInvestigation: typeof source.assistedInvestigation === "boolean"
      ? source.assistedInvestigation
      : (fallback.assistedInvestigation ?? false),
    runStartedAt: runStartedAtOr(source.runStartedAt, fallback.runStartedAt ?? Date.now()),
    audio: audioSettingsOr(source.audio, fallback.audio),
    soundDegraded: typeof source.soundDegraded === "boolean" ? source.soundDegraded : fallback.soundDegraded,
  };
}

const freshProgress = {
  completedPuzzles: [] as PuzzleId[],
  unlockedEvidenceIds: [...initialEvidenceIds],
  readDocumentIds: [] as string[],
  readMessageIds: [] as string[],
  readEvidenceIds: [] as string[],
  evidenceVerdicts: {} as Record<string, EvidenceVerdict>,
  evidenceNotes: {} as Record<string, string>,
  evidenceRelations: {} as EvidenceRelations,
  evidenceReviewTouchedIds: [] as string[],
  legacyVerifiedEvidenceIds: [] as string[],
  caseNote: "",
  discoveredAnonymous: false,
  currentEnding: null as EndingId | null,
  puzzleAttempts: {} as Partial<Record<PuzzleId, number>>,
  taskProgress: {} as TaskProgress,
  runNarrativeEventIds: [] as NarrativeEventId[],
  runDiscoveredEasterEggIds: [] as EasterEggId[],
  seenCinematicEvents: [] as CinematicEventId[],
  seenAmbientEvents: [] as AmbientEventId[],
  provisionalTheory: {} as ProvisionalTheoryState,
  theoryHistory: [] as string[],
  runEndedAt: null as number | null,
  unlockQueue: [] as UnlockEventId[],
  lastUnlock: null as string | null,
};

function unique<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      investigatorCode: "",
      bootSeen: false,
      runCount: 1,
      completedRuns: 0,
      runHistory: [],
      endingsSeen: [],
      seenNarrativeEvents: [],
      discoveredEasterEggs: [],
      ambientEventSeed: normalizeAmbientSeed(Date.now()),
      runMemory: {
        correctedTheoryBefore: false,
        endingsSeenAtRunStart: [],
        easterEggCountAtRunStart: 0,
      },
      assistedInvestigation: false,
      runStartedAt: Date.now(),
      audio: { muted: false, volume: 0.42, ambient: true, interface: true },
      soundDegraded: false,
      ...freshProgress,
      setHydrated: (value) => set({ hydrated: value }),
      setInvestigatorCode: (code) => set({ investigatorCode: code.trim().slice(0, 18) }),
      markBootSeen: () => set({ bootSeen: true }),
      markDocumentRead: (id) => set((state) => ({ readDocumentIds: unique([...state.readDocumentIds, id]) })),
      markMessageRead: (id) => set((state) => ({ readMessageIds: unique([...state.readMessageIds, id]) })),
      markEvidenceRead: (id) => set((state) => ({ readEvidenceIds: unique([...state.readEvidenceIds, id]) })),
      setEvidenceVerdict: (id, verdict) => set((state) => ({
        evidenceVerdicts: { ...state.evidenceVerdicts, [id]: verdict },
        evidenceReviewTouchedIds: unique([...state.evidenceReviewTouchedIds, id]),
        legacyVerifiedEvidenceIds: state.legacyVerifiedEvidenceIds.filter((item) => item !== id),
      })),
      toggleEvidenceRelation: (id, relatedId, relation) => {
        if (!id || !relatedId || id === relatedId) return;
        set((state) => {
          const current = state.evidenceRelations[id] ?? { supports: [], contradicts: [] };
          const otherRelation = relation === "supports" ? "contradicts" : "supports";
          const selected = current[relation].includes(relatedId);
          return {
            evidenceRelations: {
              ...state.evidenceRelations,
              [id]: {
                ...current,
                [relation]: selected
                  ? current[relation].filter((item) => item !== relatedId)
                  : unique([...current[relation], relatedId]),
                [otherRelation]: current[otherRelation].filter((item) => item !== relatedId),
              },
            },
            evidenceReviewTouchedIds: unique([...state.evidenceReviewTouchedIds, id]),
            legacyVerifiedEvidenceIds: state.legacyVerifiedEvidenceIds.filter((item) => item !== id),
          };
        });
      },
      setEvidenceNote: (id, note) => set((state) => ({ evidenceNotes: { ...state.evidenceNotes, [id]: note } })),
      setCaseNote: (caseNote) => set({ caseNote }),
      recordAttempt: (id) => set((state) => ({ puzzleAttempts: { ...state.puzzleAttempts, [id]: (state.puzzleAttempts[id] ?? 0) + 1 } })),
      markTaskProgress: (taskId, itemId) => {
        const normalizedId = itemId.trim();
        if (!normalizedId) return;
        set((state) => ({
          taskProgress: {
            ...state.taskProgress,
            [taskId]: unique([...(state.taskProgress[taskId] ?? []), normalizedId]),
          },
        }));
      },
      markNarrativeEventSeen: (id) => set((state) => {
        const isNewDiscovery = !state.seenNarrativeEvents.includes(id);
        const seenNarrativeEvents = unique([...state.seenNarrativeEvents, id]);
        const runNarrativeEventIds = isNewDiscovery
          ? unique([...state.runNarrativeEventIds, id])
          : state.runNarrativeEventIds;
        return {
          seenNarrativeEvents,
          runNarrativeEventIds,
          runHistory: state.currentEnding
            ? state.runHistory.map((run) => run.runNumber === state.runCount
              ? { ...run, narrativeEventIds: runNarrativeEventIds }
              : run)
            : state.runHistory,
        };
      }),
      markCinematicEventSeen: (id) => {
        if (!isCinematicEventId(id)) return;
        set((state) => ({
          seenCinematicEvents: unique([...state.seenCinematicEvents, id]),
        }));
      },
      markAmbientEventSeen: (id) => {
        if (!isAmbientEventId(id)) return;
        set((state) => {
          if (state.seenAmbientEvents.includes(id)
            || state.seenAmbientEvents.length >= MAX_AMBIENT_EVENTS_PER_RUN) {
            return state;
          }
          return { seenAmbientEvents: [...state.seenAmbientEvents, id] };
        });
      },
      discoverEasterEgg: (id) => set((state) => {
        const isNewDiscovery = !state.discoveredEasterEggs.includes(id);
        const discoveredEasterEggs = recordEasterEggDiscovery(state.discoveredEasterEggs, id);
        const runDiscoveredEasterEggIds = isNewDiscovery
          ? recordEasterEggDiscovery(state.runDiscoveredEasterEggIds, id)
          : state.runDiscoveredEasterEggIds;
        return {
          discoveredEasterEggs,
          runDiscoveredEasterEggIds,
          runHistory: state.currentEnding
            ? state.runHistory.map((run) => run.runNumber === state.runCount
              ? {
                  ...run,
                  discoveredEasterEggCount: runDiscoveredEasterEggIds.length,
                  discoveredEasterEggIds: runDiscoveredEasterEggIds,
                }
              : run)
            : state.runHistory,
        };
      }),
      setSecondFigureTheory: (value) => set((state) => {
        const previous = state.provisionalTheory.secondFigure;
        if (previous === value) return state;
        return {
          provisionalTheory: { ...state.provisionalTheory, secondFigure: value },
          theoryHistory: [...state.theoryHistory, previous ? `${previous}->${value}` : value],
        };
      }),
      setAssistedInvestigation: (value) => set({ assistedInvestigation: value }),
      completePuzzle: (id) => {
        if (get().completedPuzzles.includes(id)) return;
        const rewards = puzzleRewards[id] ?? [];
        set((state) => ({
          completedPuzzles: [...state.completedPuzzles, id],
          unlockedEvidenceIds: unique([...state.unlockedEvidenceIds, ...rewards]),
          unlockQueue: [...state.unlockQueue, id],
          lastUnlock: id,
        }));
      },
      identifyAnonymous: () => {
        if (get().discoveredAnonymous) return;
        set((state) => ({
          discoveredAnonymous: true,
          unlockedEvidenceIds: unique([...state.unlockedEvidenceIds, "ev-voiceprint"]),
          unlockQueue: [...state.unlockQueue, "anonymous"],
          lastUnlock: "anonymous",
        }));
      },
      chooseEnding: (id) => set((state) => {
        if (state.currentEnding) return state;
        const endedAt = Date.now();
        const snapshot: InvestigationRunSnapshot = {
          runNumber: state.runCount,
          startedAt: state.runStartedAt,
          endedAt,
          completedPuzzles: [...state.completedPuzzles],
          unlockedEvidenceIds: [...state.unlockedEvidenceIds],
          readDocumentIds: [...state.readDocumentIds],
          readMessageIds: [...state.readMessageIds],
          readEvidenceIds: [...state.readEvidenceIds],
          evidenceNotes: { ...state.evidenceNotes },
          caseNote: state.caseNote,
          puzzleAttempts: { ...state.puzzleAttempts },
          narrativeEventIds: [...state.runNarrativeEventIds],
          theoryHistory: [...state.theoryHistory],
          discoveredEasterEggCount: state.runDiscoveredEasterEggIds.length,
          discoveredEasterEggIds: [...state.runDiscoveredEasterEggIds],
          assistedInvestigation: state.assistedInvestigation,
          endingId: id,
        };
        return {
          currentEnding: id,
          runEndedAt: endedAt,
          runHistory: [...state.runHistory.filter((run) => run.runNumber !== state.runCount), snapshot].slice(-20),
          completedRuns: state.completedRuns + 1,
          endingsSeen: unique([...state.endingsSeen, id]) as EndingId[],
        };
      }),
      dismissUnlock: () => set({ lastUnlock: null }),
      dismissUnlockNotification: (id) => set((state) => {
        const current = state.unlockQueue[0];
        if (!current || (id && current !== id)) return state;
        return { unlockQueue: state.unlockQueue.slice(1) };
      }),
      updateAudio: (settings) => set((state) => ({ audio: { ...state.audio, ...settings } })),
      setSoundDegraded: (value) => set({ soundDegraded: value }),
      restartCase: () => set((state) => ({
        ...freshProgress,
        hydrated: true,
        investigatorCode: state.investigatorCode,
        bootSeen: true,
        runCount: state.runCount + 1,
        completedRuns: state.completedRuns,
        runHistory: state.runHistory,
        endingsSeen: state.endingsSeen,
        seenNarrativeEvents: state.seenNarrativeEvents,
        discoveredEasterEggs: state.discoveredEasterEggs,
        seenCinematicEvents: state.seenNarrativeEvents.includes("external-reader-detected")
          || state.seenCinematicEvents.includes("external-reader")
          ? ["external-reader"]
          : [],
        ambientEventSeed: nextAmbientSeed(state.ambientEventSeed),
        runMemory: {
          correctedTheoryBefore: state.runMemory.correctedTheoryBefore
            || hasTheoryCorrection(state.theoryHistory),
          endingsSeenAtRunStart: [...state.endingsSeen],
          easterEggCountAtRunStart: state.discoveredEasterEggs.length,
        },
        assistedInvestigation: state.assistedInvestigation,
        runStartedAt: Date.now(),
        audio: state.audio,
        soundDegraded: state.soundDegraded,
      })),
      clearAllProgress: () => {
        useWindowStore.getState().resetEasterEggSession();
        set((state) => ({
          ...freshProgress,
          hydrated: true,
          investigatorCode: "",
          bootSeen: false,
          runCount: 1,
          completedRuns: 0,
          runHistory: [],
          endingsSeen: [],
          seenNarrativeEvents: [],
          discoveredEasterEggs: [],
          ambientEventSeed: normalizeAmbientSeed(Date.now()),
          runMemory: {
            correctedTheoryBefore: false,
            endingsSeenAtRunStart: [],
            easterEggCountAtRunStart: 0,
          },
          assistedInvestigation: false,
          runStartedAt: Date.now(),
          audio: state.audio,
          soundDegraded: state.soundDegraded,
        }));
      },
    }),
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: persistedSnapshot,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedCaseState(persistedState, persistedSnapshot(currentState)),
      }),
    },
  ),
);

export async function hydrateCaseStore() {
  try {
    await useCaseStore.persist.rehydrate();
  } catch {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be blocked. The in-memory investigation remains playable.
    }
  } finally {
    useCaseStore.getState().setHydrated(true);
  }
}
