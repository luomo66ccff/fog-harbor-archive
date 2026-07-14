import type { PuzzleId } from "./case";

export interface PuzzleDefinition {
  id: PuzzleId;
  index: string;
  title: string;
  prompt: string;
  reward: string;
}

export interface PhotoPieceState {
  id: number;
  slot: number | null;
  rotation: number;
}

