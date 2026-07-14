import type { PhotoPieceState } from "@/types/puzzle";

export const SCHEDULE_ANSWER = "11";
export const FREQUENCY_ANSWER = "0712";
export const HIDDEN_ANSWER = "TIDE7";

export function normalizeRotation(value: number) {
  return ((value % 360) + 360) % 360;
}

export function isPhotoSolved(pieces: PhotoPieceState[]) {
  return pieces.length === 6 && pieces.every((piece) => piece.slot === piece.id && normalizeRotation(piece.rotation) === 0);
}

export const deductionSlots = ["person", "time", "place", "action", "motive"] as const;

export const deductionAnswer: Record<(typeof deductionSlots)[number], string> = {
  person: "zhou-jiming",
  time: "00:31",
  place: "loc-control",
  action: "clock-shift",
  motive: "hide-heron",
};

export function isDeductionSolved(values: Partial<Record<(typeof deductionSlots)[number], string>>) {
  return deductionSlots.every((slot) => values[slot] === deductionAnswer[slot]);
}
