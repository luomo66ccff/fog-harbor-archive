import type {
  NarrativeContext,
  NarrativeEvent,
  NarrativeEventId,
  NarrativeTrigger,
} from "@/types/narrative";

const narrativeEventIds = [
  "first-time-contradiction",
  "archive-watch-warning",
  "xuwancheng-false-lead",
  "tape-edit-detected",
  "second-figure-theory",
  "theory-correction",
  "gu-weian-payment-context",
  "chen-mu-protective-lie",
  "external-reader-detected",
  "investigator-index-written",
] as const satisfies readonly NarrativeEventId[];

const narrativeEventIdSet = new Set<string>(narrativeEventIds);
export const LEGACY_INVESTIGATOR_EVENT_ID = "investigator-file-created";

export function isNarrativeEventId(value: unknown): value is NarrativeEventId {
  return typeof value === "string" && narrativeEventIdSet.has(value);
}

export function normalizeNarrativeEventId(value: unknown): NarrativeEventId | null {
  if (value === LEGACY_INVESTIGATOR_EVENT_ID) return "investigator-index-written";
  return isNarrativeEventId(value) ? value : null;
}

export const narrativeEvents: readonly NarrativeEvent[] = [
  {
    id: "first-time-contradiction",
    trigger: {
      kind: "any",
      triggers: [
        { kind: "documents-read", documentIds: ["doc-case", "doc-weather"] },
        { kind: "puzzle-complete", puzzleId: "frequency" },
      ],
    },
    title: "第一处矛盾",
    body: [
      "结案摘要反复声称当夜暴雨，自动气象站却记录了整夜 0.0mm 降水。",
      "至少有一份材料不是在描述那一夜，而是在复制事后准备好的口径。",
    ],
    source: "archive",
    oneShot: true,
    target: { windowId: "archive", tab: "documents", focusId: "doc-weather" },
  },
  {
    id: "archive-watch-warning",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "puzzle-complete", puzzleId: "schedule" },
        { kind: "narrative-event-seen", eventId: "first-time-contradiction" },
      ],
    },
    title: "自动风险报告",
    body: [
      "检测到调查员正在重建已封存时间链。",
      "会话读取状态已同步至未知外部节点。该节点不属于本地档案馆。",
    ],
    source: "system",
    oneShot: true,
    target: { windowId: "inbox", focusId: "msg-offset" },
  },
  {
    id: "xuwancheng-false-lead",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "puzzle-complete", puzzleId: "frequency" },
        { kind: "narrative-event-seen", eventId: "archive-watch-warning" },
      ],
    },
    title: "背景口令匹配",
    body: [
      "纸带底噪中出现了气象站工程口令，签发账号属于许晚澄。",
      "它既可能是追踪命令，也可能是某个被远程关闭的报警节点；现有材料不足以下结论。",
    ],
    source: "archive",
    oneShot: true,
    target: { windowId: "people", focusId: "xu-wancheng" },
  },
  {
    id: "tape-edit-detected",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "puzzle-complete", puzzleId: "frequency" },
        { kind: "narrative-event-seen", eventId: "xuwancheng-false-lead" },
      ],
    },
    title: "磁带剪接痕迹",
    body: [
      "口令之后存在一次人为剪接。录音带并非为了留下遗言，而是为了让某个人确认她仍然活着。",
      "许晚澄的口令出现在报警关闭前，不在追捕调度之后。最初的嫌疑需要保留，但不能当作结论。",
    ],
    source: "tide-0",
    oneShot: true,
    target: { windowId: "audio", tab: "transcripts", focusId: "audio-call" },
  },
  {
    id: "second-figure-theory",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "puzzle-complete", puzzleId: "photo" },
        { kind: "narrative-event-seen", eventId: "tape-edit-detected" },
      ],
    },
    title: "照片中的第三方",
    body: [
      "第二道人影正靠近检修梯。现有轮廓无法证明他是在追赶林知夏，还是在把她从水里拉起来。",
      "请先记录临时判断。后续证据可以确认它，也可以推翻它。",
    ],
    source: "system",
    oneShot: true,
    target: { windowId: "surveillance" },
  },
  {
    id: "theory-correction",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "narrative-event-seen", eventId: "second-figure-theory" },
        {
          kind: "any",
          triggers: [
            { kind: "evidence-read", evidenceIds: ["ev-toolbox"] },
            { kind: "evidence-read", evidenceIds: ["ev-voiceprint"] },
          ],
        },
        { kind: "theory-history-at-least", count: 2 },
      ],
    },
    title: "临时判断已修正",
    body: [
      "新证据改变了你对第二道人影的判断。档案保留了这次修正，而不是替你抹掉最初的怀疑。",
      "撒谎证明陈牧隐瞒了行动，却不能单独证明他的行动是伤害还是救援。",
    ],
    source: "memory",
    oneShot: true,
    target: { windowId: "people", focusId: "chen-mu" },
  },
  {
    id: "gu-weian-payment-context",
    trigger: { kind: "evidence-read", evidenceIds: ["ev-medical-context"] },
    title: "付款记录的另一层背景",
    body: [
      "顾惟安确实开闸、擦除记录并收下款项；同一批流水也指向他女儿的紧急治疗。",
      "胁迫不能抹去事实责任，但它改变了这笔付款所描述的道德位置。",
    ],
    source: "archive",
    oneShot: true,
    target: { windowId: "people", focusId: "gu-weian" },
  },
  {
    id: "chen-mu-protective-lie",
    trigger: {
      kind: "all",
      triggers: [
        { kind: "evidence-read", evidenceIds: ["ev-toolbox"] },
        { kind: "second-figure-set" },
      ],
    },
    title: "保护性的谎言",
    body: [
      "陈牧的工具箱留在检修梯下层。他向警方隐瞒了离开船坞和接近水线的事实。",
      "这份谎言保护了林知夏的生还路径，也让案件真相继续被封存在错误结论里。",
    ],
    source: "archive",
    oneShot: true,
    target: { windowId: "people", focusId: "chen-mu" },
  },
] as const;

function matchesTrigger(
  trigger: NarrativeTrigger,
  context: NarrativeContext,
  seen: ReadonlySet<NarrativeEventId>,
): boolean {
  switch (trigger.kind) {
    case "all":
      return trigger.triggers.every((item) => matchesTrigger(item, context, seen));
    case "any":
      return trigger.triggers.some((item) => matchesTrigger(item, context, seen));
    case "puzzle-complete":
      return context.completedPuzzles.includes(trigger.puzzleId);
    case "documents-read":
      return trigger.documentIds.every((id) => context.readDocumentIds.includes(id));
    case "evidence-read":
      return trigger.evidenceIds.every((id) => context.readEvidenceIds.includes(id));
    case "anonymous-identified":
      return context.discoveredAnonymous;
    case "second-figure-set":
      return trigger.value
        ? context.provisionalTheory.secondFigure === trigger.value
        : context.provisionalTheory.secondFigure !== undefined;
    case "theory-history-at-least":
      return context.theoryHistory.length >= Math.max(0, trigger.count);
    case "narrative-event-seen":
      return seen.has(trigger.eventId);
    case "ending-chosen":
      return context.currentEnding === trigger.endingId;
  }
}

export function getPendingNarrativeEvents(
  context: NarrativeContext,
  seen: readonly NarrativeEventId[],
): NarrativeEvent[] {
  const seenEvents = new Set(seen.filter(isNarrativeEventId));
  return narrativeEvents.filter((event) => (
    (!event.oneShot || !seenEvents.has(event.id))
    && matchesTrigger(event.trigger, context, seenEvents)
  ));
}

export function getNextNarrativeEvent(
  context: NarrativeContext,
  seen: readonly NarrativeEventId[],
): NarrativeEvent | null {
  return getPendingNarrativeEvents(context, seen)[0] ?? null;
}
