import type { EndingId, PuzzleId, WindowNavigationTarget } from "./case";

export type NarrativeEventId =
  | "first-time-contradiction"
  | "archive-watch-warning"
  | "xuwancheng-false-lead"
  | "tape-edit-detected"
  | "second-figure-theory"
  | "theory-correction"
  | "gu-weian-payment-context"
  | "chen-mu-protective-lie"
  | "external-reader-detected"
  | "investigator-file-created";

export type EasterEggId =
  | "lamp-morse-0712"
  | "seven-stamp"
  | "mirror-map"
  | "rain-trace"
  | "archive-acrostic"
  | "ghost-channel"
  | "second-run-knock"
  | "investigator-index";

export type SecondFigureTheory = "pursuer" | "rescuer" | "unknown";

export interface ProvisionalTheoryState {
  secondFigure?: SecondFigureTheory;
}

export interface NarrativeState {
  seenNarrativeEvents: NarrativeEventId[];
  discoveredEasterEggs: EasterEggId[];
  provisionalTheory: ProvisionalTheoryState;
  theoryHistory: string[];
  assistedInvestigation: boolean;
  /** Local epoch time for the current run; no identity or device data is collected. */
  runStartedAt: number;
}

export type NarrativeTrigger =
  | { kind: "all"; triggers: readonly NarrativeTrigger[] }
  | { kind: "any"; triggers: readonly NarrativeTrigger[] }
  | { kind: "puzzle-complete"; puzzleId: PuzzleId }
  | { kind: "documents-read"; documentIds: readonly string[] }
  | { kind: "evidence-read"; evidenceIds: readonly string[] }
  | { kind: "anonymous-identified" }
  | { kind: "second-figure-set"; value?: SecondFigureTheory }
  | { kind: "theory-history-at-least"; count: number }
  | { kind: "narrative-event-seen"; eventId: NarrativeEventId }
  | { kind: "ending-chosen"; endingId: EndingId };

export interface NarrativeEvent {
  id: NarrativeEventId;
  trigger: NarrativeTrigger;
  title?: string;
  body: string[];
  source: "system" | "tide-0" | "archive" | "memory";
  oneShot: boolean;
  target?: WindowNavigationTarget;
}

export interface NarrativeContext {
  completedPuzzles: readonly PuzzleId[];
  readDocumentIds: readonly string[];
  readEvidenceIds: readonly string[];
  discoveredAnonymous: boolean;
  provisionalTheory: ProvisionalTheoryState;
  theoryHistory: readonly string[];
  currentEnding: EndingId | null;
}
