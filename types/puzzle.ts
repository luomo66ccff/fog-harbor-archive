import type { PuzzleId } from "./case";

export interface PuzzleDefinition {
  id: PuzzleId;
  index: string;
  title: string;
  prompt: string;
  reward: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  systemMinute: number;
  physicalMinute: number;
  systemTime: string;
  physicalTime: string;
}

export interface TimelineAlignmentResult {
  offset: number;
  alignedIds: string[];
  misalignedIds: string[];
  complete: boolean;
  direction: "forward" | "backward" | "aligned";
}

export type FrequencyFilter = "raw" | "low" | "high";

export interface FrequencySignalState {
  speed: number;
  filter: FrequencyFilter;
  progress: number;
  playedSignalWindow: boolean;
}

export interface PhotoPieceState {
  id: number;
  slot: number;
  /** Kept optional so an in-memory draft from the previous puzzle shape remains readable. */
  rotation?: number;
}

export type PhotoPuzzleStage = "assembling" | "scanning" | "inspecting";
export type PhotoHotspotId = "ship-number" | "second-figure";
