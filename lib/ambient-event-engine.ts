import type {
  AmbientContext,
  AmbientEvent,
  AmbientEventId,
} from "@/types/narrative";

export const MAX_AMBIENT_EVENTS_PER_RUN = 2;
export const DEFAULT_AMBIENT_EVENT_SEED = 0x0712c00d;

export const ambientEventIds = [
  "phantom-unread-count",
  "session-date-echo",
  "ghost-channel-label",
  "four-note-horn",
  "map-redline-extension",
  "notebook-pressure-mark",
] as const satisfies readonly AmbientEventId[];

const ambientEventIdSet = new Set<string>(ambientEventIds);

export function isAmbientEventId(value: unknown): value is AmbientEventId {
  return typeof value === "string" && ambientEventIdSet.has(value);
}

export const ambientEvents: readonly AmbientEvent[] = [
  {
    id: "phantom-unread-count",
    effect: "inbox-unread-ghost",
    text: "收件箱角标短暂多出 1 条未读；打开后，数字恢复原状。",
    minDelayMs: 75_000,
    maxDelayMs: 155_000,
    reducedMotion: {
      mode: "static",
      text: "收件箱角标出现一次无法对应邮件的 +1 记录。",
    },
  },
  {
    id: "session-date-echo",
    effect: "archive-date-session-echo",
    text: "一页旧档案的日期闪回了本次会话日期，随后恢复为 2007-07-12。",
    minDelayMs: 90_000,
    maxDelayMs: 180_000,
    reducedMotion: {
      mode: "static",
      text: "档案边注记录：页面曾短暂显示本次会话日期。",
    },
  },
  {
    id: "ghost-channel-label",
    effect: "audio-channel-c00-label",
    text: "音轨列表底部浮出一行 C-00，信号源一栏为空。",
    minDelayMs: 60_000,
    maxDelayMs: 145_000,
    requiresPuzzle: "frequency",
    reducedMotion: {
      mode: "static",
      text: "音频索引新增过一条无信号源的 C-00 标签。",
    },
  },
  {
    id: "four-note-horn",
    effect: "harbor-horn-three-short-one-long",
    text: "雾外传来三短一长的汽笛；波形没有留下对应峰值。",
    minDelayMs: 110_000,
    maxDelayMs: 210_000,
    reducedMotion: {
      mode: "static",
      text: "环境记录捕获到三短一长的汽笛节律，但没有波形。",
    },
  },
  {
    id: "map-redline-extension",
    effect: "map-redline-extension",
    text: "地图上的红线越过第七码头边界延伸了一个路段，又在指针靠近前消失。",
    minDelayMs: 80_000,
    maxDelayMs: 170_000,
    requiresPuzzle: "schedule",
    reducedMotion: {
      mode: "static",
      text: "地图缓存中留有一段越过第七码头边界的红线残影。",
    },
  },
  {
    id: "notebook-pressure-mark",
    effect: "notebook-indentation-reveal",
    text: "笔记空白处浮出上一页留下的压痕：『不是第七个码头』。",
    minDelayMs: 100_000,
    maxDelayMs: 195_000,
    reducedMotion: {
      mode: "static",
      text: "笔记压痕可辨认为：『不是第七个码头』。",
    },
  },
] as const;

/** Coerces an entropy source into a stable, non-zero uint32 seed. */
export function normalizeAmbientSeed(
  value: unknown,
  fallback: number = DEFAULT_AMBIENT_EVENT_SEED,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.trunc(value) >>> 0;
    if (normalized !== 0) return normalized;
  }
  if (fallback !== DEFAULT_AMBIENT_EVENT_SEED) {
    return normalizeAmbientSeed(fallback, DEFAULT_AMBIENT_EVENT_SEED);
  }
  return DEFAULT_AMBIENT_EVENT_SEED;
}

/** Advances the deterministic sequence when a new investigation run begins. */
export function nextAmbientSeed(seed: number): number {
  const current = normalizeAmbientSeed(seed);
  return normalizeAmbientSeed((Math.imul(current, 1_664_525) + 1_013_904_223) >>> 0);
}

function seededRandom(seed: number): () => number {
  let state = normalizeAmbientSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function isEligible(event: AmbientEvent, completedPuzzles: readonly string[]): boolean {
  return !event.requiresPuzzle || completedPuzzles.includes(event.requiresPuzzle);
}

/**
 * Returns a deterministic cosmetic plan. The engine never exposes progress,
 * evidence, reward, or puzzle mutation callbacks, and always caps a run at two.
 */
export function selectAmbientEventsForRun(
  seed: number,
  completedPuzzles: AmbientContext["completedPuzzles"] = [],
): AmbientEvent[] {
  const random = seededRandom(seed);
  const candidates = [...ambientEvents];

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  return candidates
    .slice(0, MAX_AMBIENT_EVENTS_PER_RUN)
    .filter((event) => isEligible(event, completedPuzzles));
}

export function getPendingAmbientEvents(
  seed: number,
  context: AmbientContext,
): AmbientEvent[] {
  const seen = new Set(context.seenAmbientEvents.filter(isAmbientEventId));
  if (seen.size >= MAX_AMBIENT_EVENTS_PER_RUN) return [];
  return selectAmbientEventsForRun(seed, context.completedPuzzles)
    .filter((event) => !seen.has(event.id));
}

/** Returns a deterministic delay inside the event's safe low-frequency window. */
export function getAmbientEventDelay(seed: number, event: AmbientEvent): number {
  let hash = normalizeAmbientSeed(seed);
  for (const character of event.id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0;
  }
  const span = Math.max(0, event.maxDelayMs - event.minDelayMs);
  return event.minDelayMs + (span === 0 ? 0 : hash % (span + 1));
}
