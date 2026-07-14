import type { PuzzleId, WindowId } from "@/types/case";

export const moduleUnlocks: Partial<Record<WindowId, PuzzleId>> = {
  audio: "schedule",
  surveillance: "frequency",
  evidence: "photo",
  finale: "deduction",
};

export function isPuzzleComplete(completed: PuzzleId[], id: PuzzleId) {
  return completed.includes(id);
}

export function isModuleUnlocked(completed: PuzzleId[], id: WindowId) {
  const required = moduleUnlocks[id];
  return !required || completed.includes(required);
}

export function availablePuzzle(completed: PuzzleId[], id: PuzzleId, anonymous = false) {
  if (id === "schedule") return true;
  if (id === "frequency") return completed.includes("schedule");
  if (id === "photo") return completed.includes("frequency");
  if (id === "deduction") return completed.includes("photo");
  return completed.includes("deduction") && anonymous;
}

export function calculateProgress(completed: PuzzleId[], evidenceCount: number, anonymous: boolean) {
  const puzzleScore = completed.filter((id) => id !== "hidden").length * 17;
  const hiddenScore = completed.includes("hidden") ? 5 : 0;
  const evidenceScore = Math.min(12, Math.max(0, evidenceCount - 6));
  const identityScore = anonymous ? 5 : 0;
  return Math.min(100, 15 + puzzleScore + hiddenScore + evidenceScore + identityScore);
}

export function credibilityLabel(completed: PuzzleId[], evidenceCount: number) {
  if (completed.includes("deduction")) return "证据链闭合";
  if (completed.includes("photo")) return "高度可信";
  if (evidenceCount > 7) return "交叉验证中";
  return "存疑";
}
