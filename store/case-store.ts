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
import { evidence, initialEvidenceIds, puzzleRewards } from "@/lib/evidence-data";

export const SAVE_KEY = "fog-harbor-save-v1";

export interface AudioSettings {
  muted: boolean;
  volume: number;
  ambient: boolean;
  interface: boolean;
}

interface CaseState {
  hydrated: boolean;
  investigatorCode: string;
  bootSeen: boolean;
  runCount: number;
  completedRuns: number;
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
  | "audio"
  | "soundDegraded"
>;

const puzzleIds = new Set<PuzzleId>(["schedule", "frequency", "photo", "deduction", "hidden"]);
const endingIds = new Set<EndingId>(["truth", "trade", "seventh"]);
const evidenceVerdicts = new Set<EvidenceVerdict>(["unmarked", "credible", "doubtful", "forged"]);
const criticalEvidenceIds = new Set(evidence.filter((item) => item.critical).map((item) => item.id));
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
  return {
    investigatorCode: typeof source.investigatorCode === "string"
      ? source.investigatorCode.trim().slice(0, 18)
      : fallback.investigatorCode,
    bootSeen: typeof source.bootSeen === "boolean" ? source.bootSeen : fallback.bootSeen,
    runCount: typeof source.runCount === "number" && Number.isInteger(source.runCount) && source.runCount >= 1
      ? source.runCount
      : fallback.runCount,
    completedRuns: typeof source.completedRuns === "number" && Number.isInteger(source.completedRuns) && source.completedRuns >= 0
      ? source.completedRuns
      : fallback.completedRuns,
    completedPuzzles: puzzleArrayOr(source.completedPuzzles, fallback.completedPuzzles),
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
    currentEnding: source.currentEnding === null || isEndingId(source.currentEnding) ? source.currentEnding : fallback.currentEnding,
    endingsSeen: endingArrayOr(source.endingsSeen, fallback.endingsSeen),
    puzzleAttempts: puzzleAttemptsOr(source.puzzleAttempts, fallback.puzzleAttempts),
    taskProgress: taskProgressOr(source.taskProgress, fallback.taskProgress),
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
  unlockQueue: [] as UnlockEventId[],
  lastUnlock: null as string | null,
};

function unique(values: string[]) {
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
      endingsSeen: [],
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
      chooseEnding: (id) => set((state) => ({
        currentEnding: id,
        completedRuns: state.currentEnding ? state.completedRuns : state.completedRuns + 1,
        endingsSeen: unique([...state.endingsSeen, id]) as EndingId[],
      })),
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
        endingsSeen: state.endingsSeen,
        audio: state.audio,
        soundDegraded: state.soundDegraded,
      })),
      clearAllProgress: () => set((state) => ({
        ...freshProgress,
        hydrated: true,
        investigatorCode: "",
        bootSeen: false,
        runCount: 1,
        completedRuns: 0,
        endingsSeen: [],
        audio: state.audio,
        soundDegraded: state.soundDegraded,
      })),
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
