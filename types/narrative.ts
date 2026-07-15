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
  | "investigator-index-written";

export type CinematicEventId =
  | "time-restored"
  | "tape-signal-locked"
  | "photo-restored"
  | "theory-corrected"
  | "chain-closed"
  | "external-reader"
  | "ending-truth"
  | "ending-trade"
  | "ending-seventh";

export type AmbientEventId =
  | "phantom-unread-count"
  | "session-date-echo"
  | "ghost-channel-label"
  | "four-note-horn"
  | "map-redline-extension"
  | "notebook-pressure-mark";

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

export interface RunMemory {
  correctedTheoryBefore: boolean;
  endingsSeenAtRunStart: EndingId[];
  easterEggCountAtRunStart: number;
}

export interface NarrativeState {
  seenNarrativeEvents: NarrativeEventId[];
  runNarrativeEventIds: NarrativeEventId[];
  discoveredEasterEggs: EasterEggId[];
  runDiscoveredEasterEggIds: EasterEggId[];
  seenCinematicEvents: CinematicEventId[];
  ambientEventSeed: number;
  seenAmbientEvents: AmbientEventId[];
  provisionalTheory: ProvisionalTheoryState;
  theoryHistory: string[];
  runMemory: RunMemory;
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

export type CinematicTrigger =
  | { kind: "puzzle-complete"; puzzleId: PuzzleId }
  | { kind: "theory-corrected" }
  | { kind: "narrative-event-seen"; eventId: NarrativeEventId }
  | { kind: "ending-chosen"; endingId: EndingId };

export interface CinematicEnvironmentChange {
  kind: string;
  description: string;
}

export interface CinematicPulse {
  kind: "visual" | "sound" | "audio-visual";
  visualCue?: string;
  soundCue?: string;
}

export interface ReducedMotionCinematicDescriptor {
  mode: "static";
  durationMs: number;
  caption: string;
  environment: "none";
  pulse: "none";
}

export interface CinematicEvent {
  id: CinematicEventId;
  trigger: CinematicTrigger;
  environment: CinematicEnvironmentChange;
  caption: string;
  pulse: CinematicPulse;
  durationMs: number;
  target?: WindowNavigationTarget;
  skippable: true;
  oneShot: true;
  reducedMotion: ReducedMotionCinematicDescriptor;
}

export interface CinematicContext {
  completedPuzzles: readonly PuzzleId[];
  theoryHistory: readonly string[];
  seenNarrativeEvents: readonly NarrativeEventId[];
  currentEnding: EndingId | null;
}

export interface ReducedMotionAmbientDescriptor {
  mode: "static";
  text: string;
}

export interface AmbientEvent {
  id: AmbientEventId;
  effect: string;
  text: string;
  minDelayMs: number;
  maxDelayMs: number;
  requiresPuzzle?: PuzzleId;
  reducedMotion: ReducedMotionAmbientDescriptor;
}

export interface AmbientContext {
  completedPuzzles: readonly PuzzleId[];
  seenAmbientEvents: readonly AmbientEventId[];
}
