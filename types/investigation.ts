import type { PuzzleId } from "./case";

export type ClaimId =
  | "clock-fabrication"
  | "heron-coverup"
  | "ladder-escape"
  | "archive02-continuity";

export type ClaimStatus = "draft" | "proven" | "contested" | "unsupported";

export type ClaimFailure =
  | "wrong-proposition"
  | "missing-evidence"
  | "weak-provenance"
  | "unhandled-rebuttal"
  | "prerequisite";

export interface ClaimSubmission {
  propositionId: string;
  evidenceIds: string[];
  rebuttalChoiceId: string;
  migrated?: boolean;
}

export interface ClaimContext {
  unlockedEvidenceIds: readonly string[];
  readEvidenceIds: readonly string[];
  completedPuzzles: readonly PuzzleId[];
  discoveredAnonymous: boolean;
  provenClaimIds?: readonly ClaimId[];
}

export interface ClaimProposition {
  id: string;
  label: string;
}

export interface ClaimRebuttalChoice {
  id: string;
  label: string;
}

export interface ClaimRebuttal {
  evidenceId: string;
  text: string;
  choices: readonly ClaimRebuttalChoice[];
}

export interface ClaimDefinition {
  id: ClaimId;
  title: string;
  question: string;
  propositions: readonly ClaimProposition[];
  rebuttal: ClaimRebuttal;
}

export interface ClaimResult {
  status: ClaimStatus;
  feedback: string;
  missingEvidenceIds: string[];
  failures: ClaimFailure[];
}

export type ClaimSubmissions = Partial<Record<ClaimId, ClaimSubmission>>;
