import { evidence } from "@/lib/evidence-data";
import type { EndingId, PuzzleId } from "@/types/case";
import { getProvenClaimIds } from "@/lib/claim-engine";
import { mainClaimIds } from "@/lib/claim-data";
import type { ClaimId, ClaimSubmission } from "@/types/investigation";

export interface EndingContext {
  completedPuzzles: PuzzleId[];
  unlockedEvidenceIds: string[];
  readEvidenceIds: string[];
  discoveredAnonymous: boolean;
  claimSubmissions?: Partial<Record<ClaimId, ClaimSubmission>>;
}

export function criticalEvidenceCount(ids: string[]) {
  const set = new Set(ids);
  return evidence.filter((item) => item.critical && set.has(item.id)).length;
}

export function getEndingAvailability(context: EndingContext) {
  const owned = new Set(context.unlockedEvidenceIds);
  const reviewed = context.readEvidenceIds.filter((id) => owned.has(id));
  const critical = criticalEvidenceCount(reviewed);
  const proven = getProvenClaimIds(context.claimSubmissions ?? {}, context);
  const mainSolved = context.completedPuzzles.includes("deduction") && mainClaimIds.every((id) => proven.includes(id));
  return {
    truth: mainSolved && context.discoveredAnonymous,
    trade: mainSolved,
    seventh:
      mainSolved &&
      proven.includes("archive02-continuity") &&
      context.discoveredAnonymous &&
      context.completedPuzzles.includes("hidden"),
    critical,
    proven,
  };
}

export function canChooseEnding(id: EndingId, context: EndingContext) {
  return getEndingAvailability(context)[id];
}
