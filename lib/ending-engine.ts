import { evidence } from "@/lib/evidence-data";
import type { EndingId, PuzzleId } from "@/types/case";

export interface EndingContext {
  completedPuzzles: PuzzleId[];
  unlockedEvidenceIds: string[];
  readEvidenceIds: string[];
  discoveredAnonymous: boolean;
}

export function criticalEvidenceCount(ids: string[]) {
  const set = new Set(ids);
  return evidence.filter((item) => item.critical && set.has(item.id)).length;
}

export function getEndingAvailability(context: EndingContext) {
  const owned = new Set(context.unlockedEvidenceIds);
  const reviewed = context.readEvidenceIds.filter((id) => owned.has(id));
  const critical = criticalEvidenceCount(reviewed);
  const mainSolved = context.completedPuzzles.includes("deduction");
  return {
    truth: mainSolved && critical >= 8,
    trade: mainSolved,
    seventh:
      mainSolved &&
      critical >= 10 &&
      context.discoveredAnonymous &&
      context.completedPuzzles.includes("hidden"),
    critical,
  };
}

export function canChooseEnding(id: EndingId, context: EndingContext) {
  return getEndingAvailability(context)[id];
}
