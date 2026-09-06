import { evidence } from "@/lib/evidence-data";
import { mainClaimIds } from "@/lib/claim-data";
import type {
  ClaimContext,
  ClaimFailure,
  ClaimId,
  ClaimResult,
  ClaimSubmission,
  ClaimSubmissions,
} from "@/types/investigation";

export { claimDefinitions, mainClaimIds } from "@/lib/claim-data";

type ClaimRule = {
  correctPropositionId: string;
  requiredEvidenceIds: readonly string[];
  rebuttalEvidenceId: string;
  prerequisites?: readonly ClaimId[];
  requiresAnonymous?: boolean;
  requiresHiddenPuzzle?: boolean;
  successFeedback: string;
  failureFeedback: string;
};

const claimRules: Record<ClaimId, ClaimRule> = {
  "clock-fabrication": {
    correctPropositionId: "manual-clock-and-weather-template",
    requiredEvidenceIds: ["ev-weather", "ev-offset", "ev-clock-admin-trace"],
    rebuttalEvidenceId: "ev-duty",
    successFeedback: "物理记录与管理员会话闭合：+11 不是设备漂移，暴雨是事后套用的封存模板。",
    failureFeedback: "当前解释不能说明多个未入校时域的来源为何一致，也没有解释谁在何时写入了 +11。",
  },
  "heron-coverup": {
    correctPropositionId: "hazmat-and-coordinated-coverup",
    requiredEvidenceIds: [
      "ev-port-log",
      "ev-photo",
      "ev-drum-stencil",
      "ev-payment",
      "ev-clock-admin-trace",
    ],
    rebuttalEvidenceId: "ev-case-file",
    successFeedback: "船号、重量、危废残码、付款与校时会话闭合，货物事实和掩盖行为均已成立。",
    failureFeedback: "当前组合只证明船只出现或存在付款，尚未把货物性质、H-1707 与周既明的动作连成同一事件。",
  },
  "ladder-escape": {
    correctPropositionId: "planned-maintenance-escape",
    requiredEvidenceIds: ["ev-audio-0712", "ev-tape-edit", "ev-rescue-channel", "ev-toolbox"],
    rebuttalEvidenceId: "ev-photo",
    successFeedback: "报警时间窗、三敲接应、检修梯实体与 M-4 离港记录闭合；陈牧是救援者，他的谎言保护了逃生路径。",
    failureFeedback: "第二道人影只能证明有人在场；当前解释尚未同时覆盖 126 秒、三敲暗号、M-4 应答和工具箱位置。",
  },
  "archive02-continuity": {
    correctPropositionId: "active-purge-network-node",
    requiredEvidenceIds: ["ev-voiceprint", "ev-seven-map", "ev-erasure-fingerprint", "ev-closure-order"],
    rebuttalEvidenceId: "ev-commission",
    prerequisites: mainClaimIds,
    requiresAnonymous: true,
    requiresHiddenPuzzle: true,
    successFeedback: "七港索引、2019 封存指令和销毁器指纹相互吻合；系统连续性成立，操作者身份仍保持未知。",
    failureFeedback: "声纹只能确认委托人，不能把她等同于 ARCHIVE-02；当前组合也未证明普通备份为何复现 2019 销毁器指纹。",
  },
};

const knownEvidenceIds = new Set(evidence.map((item) => item.id));

// Provenance is deliberately private: the board receives evidence IDs and text only.
// The two derived pairs share one source group, so they cannot manufacture independence.
const sourceGroupByEvidenceId: Record<string, string> = {
  "ev-weather": "aws-3",
  "ev-offset": "timeline-cross-check",
  "ev-clock-admin-trace": "ctrl-worm-audit",
  "ev-duty": "handwritten-duty",
  "ev-port-log": "dispatch-log",
  "ev-photo": "cctv-multispectral",
  "ev-drum-stencil": "cctv-multispectral",
  "ev-payment": "financial-audit",
  "ev-case-file": "official-summary",
  "ev-audio-0712": "paper-tape",
  "ev-tape-edit": "paper-tape",
  "ev-rescue-channel": "maintenance-radio-cache",
  "ev-toolbox": "physical-inspection",
  "ev-voiceprint": "live-voice-cache",
  "ev-seven-map": "mirror-map",
  "ev-erasure-fingerprint": "layer7-worm-diff",
  "ev-closure-order": "office-order",
  "ev-commission": "inbox",
};

function normalizeContext(context: Partial<ClaimContext> | undefined): ClaimContext {
  return {
    unlockedEvidenceIds: Array.isArray(context?.unlockedEvidenceIds) ? context.unlockedEvidenceIds : [],
    readEvidenceIds: Array.isArray(context?.readEvidenceIds) ? context.readEvidenceIds : [],
    completedPuzzles: Array.isArray(context?.completedPuzzles) ? context.completedPuzzles : [],
    discoveredAnonymous: context?.discoveredAnonymous === true,
    provenClaimIds: Array.isArray(context?.provenClaimIds) ? context.provenClaimIds : [],
  };
}

function allEvidenceIds(rule: ClaimRule): readonly string[] {
  return [...rule.requiredEvidenceIds, rule.rebuttalEvidenceId];
}

function sourceGroupForEvidenceId(id: string): string {
  const privateGroup = sourceGroupByEvidenceId[id];
  if (privateGroup) return privateGroup;

  const item = evidence.find((candidate) => candidate.id === id) as
    | (typeof evidence[number] & { provenanceKey?: string; sourceGroup?: string })
    | undefined;
  return item?.provenanceKey ?? item?.sourceGroup ?? item?.source ?? id;
}

function canonicalMigratedSubmission(id: ClaimId, submission: ClaimSubmission | undefined): boolean {
  if (!submission?.migrated) return false;
  const rule = claimRules[id];
  if (!rule || submission.propositionId !== rule.correctPropositionId || submission.rebuttalChoiceId !== "cross-check") {
    return false;
  }
  const submitted = new Set(Array.isArray(submission.evidenceIds) ? submission.evidenceIds : []);
  return allEvidenceIds(rule).every((evidenceId) => submitted.has(evidenceId));
}

function missingEvidenceIds(
  rule: ClaimRule,
  submission: ClaimSubmission | undefined,
  context: ClaimContext,
): string[] {
  const submitted = new Set(Array.isArray(submission?.evidenceIds) ? submission.evidenceIds : []);
  const unlocked = new Set(context.unlockedEvidenceIds);
  const read = new Set(context.readEvidenceIds);
  return allEvidenceIds(rule).filter(
    (evidenceId, index, expected) =>
      expected.indexOf(evidenceId) === index
      && (!submitted.has(evidenceId) || !unlocked.has(evidenceId) || !read.has(evidenceId)),
  );
}

function hasWeakProvenance(
  submission: ClaimSubmission | undefined,
  context: ClaimContext,
): boolean {
  const unlocked = new Set(context.unlockedEvidenceIds);
  const read = new Set(context.readEvidenceIds);
  const groups = new Set(
    (Array.isArray(submission?.evidenceIds) ? submission.evidenceIds : [])
      .filter((id) => knownEvidenceIds.has(id) && unlocked.has(id) && read.has(id))
      .map(sourceGroupForEvidenceId),
  );
  return groups.size < 2;
}

function missingPrerequisite(rule: ClaimRule, context: ClaimContext): boolean {
  if (prerequisiteMessages(rule, context).length > 0) return true;
  return false;
}

function prerequisiteMessages(rule: ClaimRule, context: ClaimContext): string[] {
  const proven = new Set(context.provenClaimIds ?? []);
  const messages: string[] = [];
  const missingClaims = (rule.prerequisites ?? []).filter((claimId) => !proven.has(claimId));
  if (missingClaims.length > 0) {
    const completedCount = (rule.prerequisites ?? []).length - missingClaims.length;
    messages.push(`完成前三项主线对质（当前 ${completedCount}/${(rule.prerequisites ?? []).length}）`);
  }
  if (rule.requiresAnonymous && !context.discoveredAnonymous) {
    messages.push("确认匿名委托人身份");
  }
  if (rule.requiresHiddenPuzzle && !context.completedPuzzles.includes("hidden")) {
    messages.push("解开地图镜像口令");
  }
  return messages;
}

function evidenceTitle(id: string): string {
  return evidence.find((item) => item.id === id)?.title ?? id;
}

function missingEvidenceMessage(
  submission: ClaimSubmission | undefined,
  context: ClaimContext,
  missing: readonly string[],
): string {
  const unlocked = new Set(context.unlockedEvidenceIds);
  const read = new Set(context.readEvidenceIds);
  const submitted = new Set(Array.isArray(submission?.evidenceIds) ? submission.evidenceIds : []);
  const visibleMissing = missing.filter((id) => unlocked.has(id));
  const unreadMissing = visibleMissing.filter((id) => !read.has(id));
  const unreadOrUnattached = visibleMissing.filter((id) => read.has(id) && !submitted.has(id));
  const lockedCount = missing.length - visibleMissing.length;
  const messages = [`还缺 ${missing.length} 份证据`];

  if (unreadMissing.length > 0) {
    messages.push(`已解锁但尚未查阅：${unreadMissing.map(evidenceTitle).join("、")}`);
  }
  if (unreadOrUnattached.length > 0) {
    messages.push(`已查阅但尚未附入：${unreadOrUnattached.map(evidenceTitle).join("、")}`);
  }
  if (lockedCount > 0) {
    messages.push(`${lockedCount} 份证据尚未解锁，请继续调查获取`);
  }
  return `${messages.join("；")}。`;
}

function claimFeedback(
  rule: ClaimRule,
  submission: ClaimSubmission | undefined,
  context: ClaimContext,
  missing: readonly string[],
  failures: readonly ClaimFailure[],
): string {
  if (failures.length === 0) return rule.successFeedback;

  const details: string[] = [];
  if (failures.includes("missing-evidence")) {
    details.push(missingEvidenceMessage(submission, context, missing));
  }
  if (failures.includes("weak-provenance")) {
    details.push("可核查的独立来源不足，至少需要两组不同来源的证据");
  }
  if (failures.includes("unhandled-rebuttal")) {
    details.push("反方解释尚未回应，请保留材料并选择“交叉核验”说明其与独立记录的冲突");
  }
  if (failures.includes("prerequisite")) {
    details.push(`前置条件未满足：${prerequisiteMessages(rule, context).join("、")}`);
  }
  return `${rule.failureFeedback} ${details.join("；")}。`;
}

export function evaluateClaim(
  id: ClaimId,
  submission: ClaimSubmission | undefined,
  context: ClaimContext,
): ClaimResult {
  const rule = claimRules[id];
  if (!rule) {
    return {
      status: "unsupported",
      feedback: "这项对质没有可用的命题定义。",
      missingEvidenceIds: [],
      failures: ["wrong-proposition"],
    };
  }

  const normalizedContext = normalizeContext(context);
  if (canonicalMigratedSubmission(id, submission)) {
    return {
      status: "proven",
      feedback: rule.successFeedback,
      missingEvidenceIds: [],
      failures: [],
    };
  }

  if (submission?.propositionId !== rule.correctPropositionId) {
    return {
      status: "unsupported",
      feedback: rule.failureFeedback,
      missingEvidenceIds: [],
      failures: ["wrong-proposition"],
    };
  }

  const missing = missingEvidenceIds(rule, submission, normalizedContext);
  const failures: ClaimFailure[] = [];
  if (missing.length > 0) failures.push("missing-evidence");
  if (hasWeakProvenance(submission, normalizedContext)) failures.push("weak-provenance");
  if (submission?.rebuttalChoiceId !== "cross-check") failures.push("unhandled-rebuttal");
  if (missingPrerequisite(rule, normalizedContext)) failures.push("prerequisite");

  return {
    status: failures.length === 0 ? "proven" : "contested",
    feedback: claimFeedback(rule, submission, normalizedContext, missing, failures),
    missingEvidenceIds: missing,
    failures,
  };
}

function submissionFor(
  submissions: ClaimSubmissions | undefined,
  id: ClaimId,
): ClaimSubmission | undefined {
  return submissions?.[id];
}

export function getProvenClaimIds(
  submissions: ClaimSubmissions | undefined,
  context: ClaimContext,
): ClaimId[] {
  const normalizedContext = normalizeContext(context);
  const proven: ClaimId[] = [];

  for (const id of mainClaimIds) {
    if (evaluateClaim(id, submissionFor(submissions, id), normalizedContext).status === "proven") {
      proven.push(id);
    }
  }

  const archiveClaimId: ClaimId = "archive02-continuity";
  if (
    evaluateClaim(
      archiveClaimId,
      submissionFor(submissions, archiveClaimId),
      { ...normalizedContext, provenClaimIds: proven.filter((id) => mainClaimIds.includes(id as typeof mainClaimIds[number])) },
    ).status === "proven"
  ) {
    proven.push(archiveClaimId);
  }

  return proven;
}

export function migrateLegacyClaims(completedPuzzles: readonly string[]): ClaimSubmissions {
  const completed = new Set(completedPuzzles);
  const migrated: ClaimSubmissions = {};

  if (completed.has("deduction")) {
    for (const id of mainClaimIds) {
      const rule = claimRules[id];
      migrated[id] = {
        propositionId: rule.correctPropositionId,
        evidenceIds: [...allEvidenceIds(rule)],
        rebuttalChoiceId: "cross-check",
        migrated: true,
      };
    }
  }

  if (completed.has("hidden")) {
    const id: ClaimId = "archive02-continuity";
    const rule = claimRules[id];
    migrated[id] = {
      propositionId: rule.correctPropositionId,
      evidenceIds: [...allEvidenceIds(rule)],
      rebuttalChoiceId: "cross-check",
      migrated: true,
    };
  }

  return migrated;
}
