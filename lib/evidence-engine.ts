import { evidence } from "@/lib/evidence-data";
import { deductionAnswer, deductionSlots } from "@/lib/puzzle-engine";
import type { EvidenceRelationSelection, EvidenceRelations, EvidenceVerdict } from "@/types/evidence";

type DeductionSlot = (typeof deductionSlots)[number];

interface EvidenceReviewRule {
  verdict: Exclude<EvidenceVerdict, "unmarked">;
  relation: keyof EvidenceRelationSelection;
  relatedIds: readonly string[];
}

const evidenceReviewRules: Record<string, EvidenceReviewRule> = {
  "ev-case-file": { verdict: "forged", relation: "contradicts", relatedIds: ["ev-weather", "ev-port-log"] },
  "ev-duty": { verdict: "doubtful", relation: "contradicts", relatedIds: ["ev-offset", "ev-fake-clerk"] },
  "ev-port-log": { verdict: "credible", relation: "supports", relatedIds: ["ev-photo", "ev-manifest"] },
  "ev-weather": { verdict: "credible", relation: "supports", relatedIds: ["ev-offset", "ev-notebook"] },
  "ev-phone": { verdict: "credible", relation: "supports", relatedIds: ["ev-audio-0712", "ev-draft"] },
  "ev-offset": { verdict: "credible", relation: "supports", relatedIds: ["ev-duty", "ev-cctv"] },
  "ev-audio-0712": { verdict: "credible", relation: "supports", relatedIds: ["ev-phone"] },
  "ev-photo": { verdict: "credible", relation: "supports", relatedIds: ["ev-port-log", "ev-cctv"] },
  "ev-cctv": { verdict: "credible", relation: "supports", relatedIds: ["ev-offset", "ev-photo"] },
  "ev-fake-clerk": { verdict: "credible", relation: "supports", relatedIds: ["ev-duty", "ev-closure-order"] },
  "ev-manifest": { verdict: "credible", relation: "supports", relatedIds: ["ev-photo", "ev-port-log"] },
  "ev-notebook": { verdict: "credible", relation: "supports", relatedIds: ["ev-weather"] },
  "ev-closure-order": { verdict: "credible", relation: "supports", relatedIds: ["ev-case-file", "ev-fake-clerk"] },
  "ev-voiceprint": { verdict: "credible", relation: "supports", relatedIds: ["ev-toolbox"] },
  "ev-final-chain": { verdict: "credible", relation: "supports", relatedIds: ["ev-offset", "ev-cctv"] },
  "ev-seven-map": { verdict: "credible", relation: "supports", relatedIds: ["ev-notebook", "ev-manifest"] },
};

export const deductionEvidenceRequirements: Record<DeductionSlot, readonly string[]> = {
  person: ["ev-duty", "ev-offset"],
  time: ["ev-offset", "ev-cctv"],
  place: ["ev-cctv", "ev-photo"],
  action: ["ev-duty", "ev-offset"],
  motive: ["ev-photo", "ev-port-log"],
};

export function emptyEvidenceRelations(): EvidenceRelationSelection {
  return { supports: [], contradicts: [] };
}

export function evaluateEvidenceReview(
  evidenceId: string,
  verdict: EvidenceVerdict,
  relations: EvidenceRelationSelection | undefined,
) {
  const rule = evidenceReviewRules[evidenceId];
  if (!rule) {
    return {
      verified: verdict !== "unmarked" && Boolean(relations?.supports.length || relations?.contradicts.length),
      message: verdict === "unmarked" ? "先判断证据，再关联一条交叉记录。" : "还需要一条交叉记录支持你的判断。",
    };
  }
  if (verdict !== rule.verdict) {
    return { verified: false, message: "这项判断仍无法解释相关记录之间的冲突。" };
  }
  const selected = relations?.[rule.relation] ?? [];
  const verified = selected.some((id) => rule.relatedIds.includes(id));
  return {
    verified,
    message: verified
      ? "判断已被独立记录交叉核验。"
      : rule.relation === "supports"
        ? "判断方向成立，但还缺少一条能相互印证的记录。"
        : "这份材料需要一条能够直接推翻其叙述的记录。",
  };
}

export function getVerifiedEvidenceIds({
  visibleEvidenceIds,
  legacyVerifiedEvidenceIds,
  touchedEvidenceIds,
  verdicts,
  relations,
}: {
  visibleEvidenceIds: string[];
  legacyVerifiedEvidenceIds: string[];
  touchedEvidenceIds: string[];
  verdicts: Record<string, EvidenceVerdict>;
  relations: EvidenceRelations;
}) {
  const visible = new Set(visibleEvidenceIds);
  const touched = new Set(touchedEvidenceIds);
  const verified = new Set(
    legacyVerifiedEvidenceIds.filter((id) => visible.has(id) && !touched.has(id)),
  );
  for (const id of visibleEvidenceIds) {
    if (evaluateEvidenceReview(id, verdicts[id] ?? "unmarked", relations[id]).verified) verified.add(id);
  }
  return [...verified];
}

export function evaluateDeductionSubmission(
  values: Partial<Record<DeductionSlot, string>>,
  evidenceBySlot: Partial<Record<DeductionSlot, string[]>>,
  verifiedEvidenceIds: string[],
  relations: EvidenceRelations,
) {
  const verified = new Set(verifiedEvidenceIds);
  const logicErrors = deductionSlots.filter((slot) => values[slot] !== deductionAnswer[slot]).length;
  const evidenceSupportMissing = deductionSlots.filter((slot) => {
    const attached = evidenceBySlot[slot] ?? [];
    return !attached.some((id) => verified.has(id) && deductionEvidenceRequirements[slot].includes(id));
  }).length;
  const attachments = new Set(deductionSlots.flatMap((slot) => evidenceBySlot[slot] ?? []));
  const conflicts = new Set<string>();
  for (const id of attachments) {
    for (const other of relations[id]?.contradicts ?? []) {
      if (!attachments.has(other)) continue;
      conflicts.add([id, other].sort().join("::"));
    }
  }
  return {
    solved: logicErrors === 0 && evidenceSupportMissing === 0 && conflicts.size === 0,
    logicErrors,
    evidenceSupportMissing,
    contradictionCount: conflicts.size,
  };
}

export function evidenceTitle(id: string) {
  return evidence.find((item) => item.id === id)?.title ?? id;
}
