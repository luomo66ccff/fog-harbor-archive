import type {
  CinematicContext,
  CinematicEvent,
  CinematicEventId,
  CinematicTrigger,
  ReducedMotionCinematicDescriptor,
} from "@/types/narrative";

export const cinematicEventIds = [
  "time-restored",
  "tape-signal-locked",
  "photo-restored",
  "theory-corrected",
  "chain-closed",
  "external-reader",
  "ending-truth",
  "ending-trade",
  "ending-seventh",
] as const satisfies readonly CinematicEventId[];

const cinematicEventIdSet = new Set<string>(cinematicEventIds);

export function isCinematicEventId(value: unknown): value is CinematicEventId {
  return typeof value === "string" && cinematicEventIdSet.has(value);
}

export const cinematicEvents: readonly CinematicEvent[] = [
  {
    id: "time-restored",
    trigger: { kind: "puzzle-complete", puzzleId: "schedule" },
    environment: {
      kind: "timeline-realignment",
      description: "时间轴刻度从错误时区滑回档案原始时刻。",
    },
    caption: "第一个不肯服从屏幕的时钟，恢复了。",
    pulse: { kind: "audio-visual", visualCue: "clock-grid-lock", soundCue: "relay-click" },
    durationMs: 2400,
    target: { windowId: "timeline" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 1800,
      caption: "时间偏移已校正。第一个时钟恢复了。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "tape-signal-locked",
    trigger: { kind: "puzzle-complete", puzzleId: "frequency" },
    environment: {
      kind: "waveform-lock",
      description: "失真的波形收束为一条可辨认的应答频段。",
    },
    caption: "这不是遗言。有人在等待她的回应。",
    pulse: { kind: "audio-visual", visualCue: "frequency-bracket", soundCue: "tape-lock" },
    durationMs: 2800,
    target: { windowId: "audio", tab: "transcripts", focusId: "audio-call" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 1900,
      caption: "信号已锁定：这不是遗言，有人在等待回应。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "photo-restored",
    trigger: { kind: "puzzle-complete", puzzleId: "photo" },
    environment: {
      kind: "photo-emulsion-restore",
      description: "受损照片的银盐颗粒归位，第二道人影重新显现。",
    },
    caption: "画面恢复了，但结论没有。",
    pulse: { kind: "visual", visualCue: "negative-flash" },
    durationMs: 2500,
    target: { windowId: "surveillance" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 1700,
      caption: "照片已恢复。第二道人影的意图仍未确定。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "theory-corrected",
    trigger: { kind: "theory-corrected" },
    environment: {
      kind: "case-thread-rewrite",
      description: "旧推论被保留为划线记录，新证据接入同一条线索链。",
    },
    caption: "新证据改变了此前推论。",
    pulse: { kind: "sound", soundCue: "pencil-reversal" },
    durationMs: 2000,
    target: { windowId: "people", focusId: "chen-mu" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 1600,
      caption: "推论已修正；旧判断仍保留在调查记录中。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "chain-closed",
    trigger: { kind: "puzzle-complete", puzzleId: "deduction" },
    environment: {
      kind: "evidence-chain-close",
      description: "证据板上的未闭合连线依次扣合，最终指向第七码头。",
    },
    caption: "事实已经闭合，责任仍然不止一种。",
    pulse: { kind: "audio-visual", visualCue: "thread-convergence", soundCue: "archive-seal" },
    durationMs: 3200,
    target: { windowId: "evidence", tab: "deduction" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 2100,
      caption: "证据链已闭合，但责任仍然不止一种。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "external-reader",
    trigger: { kind: "narrative-event-seen", eventId: "external-reader-detected" },
    environment: {
      kind: "external-node-trace",
      description: "终端边缘出现一次来自未登记节点的同步读取。",
    },
    caption: "检测到外部读取者。它和你看见了同一页。",
    pulse: { kind: "audio-visual", visualCue: "remote-cursor-blink", soundCue: "line-open" },
    durationMs: 2600,
    target: { windowId: "finale" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 1800,
      caption: "检测到未登记节点同步读取当前档案。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "ending-truth",
    trigger: { kind: "ending-chosen", endingId: "truth" },
    environment: {
      kind: "archive-release",
      description: "封存标记褪去，完整证据链进入公开副本。",
    },
    caption: "真相离开雾港之后，才开始承担它的重量。",
    pulse: { kind: "audio-visual", visualCue: "seal-dissolve", soundCue: "distant-buoy" },
    durationMs: 3600,
    target: { windowId: "finale" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 2400,
      caption: "完整档案已公开。真相开始承担它的重量。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "ending-trade",
    trigger: { kind: "ending-chosen", endingId: "trade" },
    environment: {
      kind: "archive-redaction",
      description: "公开副本停在关键姓名之前，交换条件写入封存层。",
    },
    caption: "你保住了一个人，也把另一部分真相留在雾里。",
    pulse: { kind: "audio-visual", visualCue: "redaction-pass", soundCue: "folder-close" },
    durationMs: 3500,
    target: { windowId: "finale" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 2300,
      caption: "交换已记录；部分真相继续封存。",
      environment: "none",
      pulse: "none",
    },
  },
  {
    id: "ending-seventh",
    trigger: { kind: "ending-chosen", endingId: "seventh" },
    environment: {
      kind: "seventh-layer-open",
      description: "档案目录向下展开一层，调查者索引等待写入。",
    },
    caption: "第七层从来不是地点。它是一份仍在书写的名单。",
    pulse: { kind: "audio-visual", visualCue: "index-cursor", soundCue: "terminal-knock" },
    durationMs: 4000,
    target: { windowId: "finale" },
    skippable: true,
    oneShot: true,
    reducedMotion: {
      mode: "static",
      durationMs: 2500,
      caption: "第七层索引已展开，等待本次调查记录写入。",
      environment: "none",
      pulse: "none",
    },
  },
] as const;

function hasTheoryCorrection(history: readonly string[]): boolean {
  return history.some((entry) => entry.includes("->"));
}

export function matchesCinematicTrigger(
  trigger: CinematicTrigger,
  context: CinematicContext,
): boolean {
  switch (trigger.kind) {
    case "puzzle-complete":
      return context.completedPuzzles.includes(trigger.puzzleId);
    case "theory-corrected":
      return hasTheoryCorrection(context.theoryHistory);
    case "narrative-event-seen":
      return context.seenNarrativeEvents.includes(trigger.eventId);
    case "ending-chosen":
      return context.currentEnding === trigger.endingId;
  }
}

export function getPendingCinematicEvents(
  context: CinematicContext,
  seen: readonly CinematicEventId[],
): CinematicEvent[] {
  const seenEvents = new Set(seen.filter(isCinematicEventId));
  return cinematicEvents.filter((event) => (
    (!event.oneShot || !seenEvents.has(event.id))
    && matchesCinematicTrigger(event.trigger, context)
  ));
}

export function getNextCinematicEvent(
  context: CinematicContext,
  seen: readonly CinematicEventId[],
): CinematicEvent | null {
  return getPendingCinematicEvents(context, seen)[0] ?? null;
}

export function getCinematicPresentation(
  event: CinematicEvent,
  reducedMotion: boolean,
): CinematicEvent | ReducedMotionCinematicDescriptor {
  return reducedMotion ? event.reducedMotion : event;
}

/**
 * Old saves did not track cinematics. Deriving already-completed beats prevents
 * a migrated investigation from replaying its entire history on first load.
 */
export function deriveSeenCinematicEvents(context: CinematicContext): CinematicEventId[] {
  return cinematicEvents
    .filter((event) => matchesCinematicTrigger(event.trigger, context))
    .map((event) => event.id);
}
