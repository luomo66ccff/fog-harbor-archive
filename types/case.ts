export type WindowId =
  | "archive"
  | "people"
  | "map"
  | "timeline"
  | "inbox"
  | "audio"
  | "surveillance"
  | "evidence"
  | "notes"
  | "settings"
  | "finale";

export type PuzzleId = "schedule" | "frequency" | "photo" | "deduction" | "hidden";

export type EndingId = "truth" | "trade" | "seventh";

export type InvestigationTaskId =
  | "restore-time"
  | "repair-call"
  | "reconstruct-photo"
  | "close-chain"
  | "review-finale";

export type UnlockEventId = PuzzleId | "anonymous";

export type WindowTab =
  | "documents"
  | "schedule"
  | "analyze"
  | "transcripts"
  | "board"
  | "deduction";

export interface WindowNavigationOptions {
  tab?: WindowTab;
  focusId?: string;
}

export interface WindowNavigationTarget extends WindowNavigationOptions {
  windowId: WindowId;
}

export interface WindowNavigationIntent extends WindowNavigationOptions {
  serial: number;
}

export type TaskProgress = Partial<Record<InvestigationTaskId, string[]>>;

export interface InvestigationTask {
  id: InvestigationTaskId;
  title: string;
  description: string;
  targetWindow: WindowId;
  targetTab?: WindowTab;
  targetFocusId?: string;
  puzzleId?: PuzzleId;
  progressLabel?: string;
  completed: boolean;
  hintLevels: readonly string[];
}

export interface Person {
  id: string;
  name: string;
  role: string;
  ageAtIncident: number;
  status: string;
  summary: string;
  statement: string;
  linkedEvidence: string[];
  secret?: string;
}

export interface ArchiveDocument {
  id: string;
  code: string;
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
  body: string[];
  unlockAfter?: PuzzleId;
  evidenceId: string;
  secondRunNote?: string;
}

export interface CaseMessage {
  id: string;
  from: string;
  subject: string;
  time: string;
  body: string[];
  unlockAfter?: PuzzleId;
  personal?: boolean;
}

export interface AudioRecord {
  id: string;
  title: string;
  source: string;
  duration: string;
  transcript: string[];
  unlockAfter?: PuzzleId;
}

export interface TimelineEntry {
  id: string;
  time: string;
  correctedTime?: string;
  title: string;
  detail: string;
  unlockAfter?: PuzzleId;
  suspicious?: boolean;
}

export interface LocationRecord {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  description: string;
  linkedEvidence: string[];
}

export interface CaseEnding {
  id: EndingId;
  label: string;
  kicker: string;
  title: string;
  body: string[];
}

export type {
  AmbientContext,
  AmbientEvent,
  AmbientEventId,
  CinematicContext,
  CinematicEnvironmentChange,
  CinematicEvent,
  CinematicEventId,
  CinematicPulse,
  CinematicTrigger,
  EasterEggId,
  NarrativeContext,
  NarrativeEvent,
  NarrativeEventId,
  NarrativeState,
  NarrativeTrigger,
  ProvisionalTheoryState,
  ReducedMotionAmbientDescriptor,
  ReducedMotionCinematicDescriptor,
  RunMemory,
  SecondFigureTheory,
} from "./narrative";
