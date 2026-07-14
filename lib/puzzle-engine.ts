import type {
  FrequencySignalState,
  PhotoHotspotId,
  PhotoPieceState,
  TimelineAlignmentResult,
  TimelineEvent,
} from "@/types/puzzle";

export const SCHEDULE_ANSWER = "11";
export const FREQUENCY_ANSWER = "0712";
export const HIDDEN_ANSWER = "TIDE7";

export const TIMELINE_CORRECT_OFFSET = Number(SCHEDULE_ANSWER);
export const TIMELINE_MIN_OFFSET = -20;
export const TIMELINE_MAX_OFFSET = 20;
export const TIMELINE_SNAP_TOLERANCE = 1;

export const timelineEvents: readonly TimelineEvent[] = [
  {
    id: "calibration-frame",
    label: "岸钟校准帧",
    systemMinute: 42,
    physicalMinute: 31,
    systemTime: "00:42",
    physicalTime: "00:31",
  },
  {
    id: "phone-start",
    label: "最后通话开始",
    systemMinute: 50,
    physicalMinute: 39,
    systemTime: "00:50",
    physicalTime: "00:39",
  },
] as const;

export function clampTimelineOffset(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(TIMELINE_MAX_OFFSET, Math.max(TIMELINE_MIN_OFFSET, Math.round(value)));
}

export function snapTimelineOffset(value: number, tolerance = TIMELINE_SNAP_TOLERANCE) {
  const offset = clampTimelineOffset(value);
  return Math.abs(offset - TIMELINE_CORRECT_OFFSET) <= Math.max(0, tolerance)
    ? TIMELINE_CORRECT_OFFSET
    : offset;
}

export function evaluateTimelineAlignment(
  value: number,
  events: readonly TimelineEvent[] = timelineEvents,
): TimelineAlignmentResult {
  const offset = clampTimelineOffset(value);
  const alignedIds = events
    .filter((event) => event.physicalMinute + offset === event.systemMinute)
    .map((event) => event.id);
  const aligned = new Set(alignedIds);
  return {
    offset,
    alignedIds,
    misalignedIds: events.filter((event) => !aligned.has(event.id)).map((event) => event.id),
    complete: events.length > 0 && alignedIds.length === events.length,
    direction: offset === TIMELINE_CORRECT_OFFSET
      ? "aligned"
      : offset < TIMELINE_CORRECT_OFFSET
        ? "forward"
        : "backward",
  };
}

export const FREQUENCY_SIGNAL_WINDOW = { start: 68, end: 86 } as const;

export function isFrequencySetupCorrect(state: Pick<FrequencySignalState, "speed" | "filter">) {
  return state.speed === 0.75 && state.filter === "high";
}

export function isFrequencySignalWindow(progress: number) {
  return Number.isFinite(progress)
    && progress >= FREQUENCY_SIGNAL_WINDOW.start
    && progress <= FREQUENCY_SIGNAL_WINDOW.end;
}

export function canLockFrequencySignal(state: FrequencySignalState) {
  return isFrequencySetupCorrect(state)
    && isFrequencySignalWindow(state.progress)
    && state.playedSignalWindow;
}

export function normalizeRotation(value: number) {
  return ((value % 360) + 360) % 360;
}

export const PHOTO_PIECE_IDS = [0, 1, 2, 3, 4, 5] as const;

function normalizePhotoOrder(order: readonly number[]) {
  const allowed = new Set<number>(PHOTO_PIECE_IDS);
  const normalized = order.filter((id, index) => allowed.has(id) && order.indexOf(id) === index);
  for (const id of PHOTO_PIECE_IDS) {
    if (!normalized.includes(id)) normalized.push(id);
  }
  return normalized.slice(0, PHOTO_PIECE_IDS.length);
}

export function createPhotoPieces(order: readonly number[] = PHOTO_PIECE_IDS): PhotoPieceState[] {
  return normalizePhotoOrder(order).map((id, slot) => ({ id, slot }));
}

export function shufflePhotoPieceIds(random: () => number = Math.random) {
  const ids = [...PHOTO_PIECE_IDS];
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const sample = Math.min(0.999999, Math.max(0, random()));
    const target = Math.floor(sample * (index + 1));
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }
  if (ids.every((id, slot) => id === slot)) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
}

export function shufflePhotoPieces(random: () => number = Math.random) {
  return createPhotoPieces(shufflePhotoPieceIds(random));
}

export function photoPieceAtSlot(pieces: readonly PhotoPieceState[], slot: number) {
  return pieces.find((piece) => piece.slot === slot);
}

export function movePhotoPiece(
  pieces: readonly PhotoPieceState[],
  pieceId: number,
  targetSlot: number,
): PhotoPieceState[] {
  const source = pieces.find((piece) => piece.id === pieceId);
  if (!source || targetSlot < 0 || targetSlot >= PHOTO_PIECE_IDS.length || source.slot === targetSlot) {
    return pieces.map((piece) => ({ ...piece }));
  }
  const displaced = photoPieceAtSlot(pieces, targetSlot);
  return pieces.map((piece) => {
    if (piece.id === pieceId) return { ...piece, slot: targetSlot };
    if (displaced && piece.id === displaced.id) return { ...piece, slot: source.slot };
    return { ...piece };
  });
}

export function countMisplacedPhotoPieces(pieces: readonly PhotoPieceState[]) {
  return PHOTO_PIECE_IDS.filter((id) => pieces.find((piece) => piece.id === id)?.slot !== id).length;
}

export function isPhotoSolved(pieces: PhotoPieceState[]) {
  if (pieces.length !== PHOTO_PIECE_IDS.length) return false;
  const ids = new Set(pieces.map((piece) => piece.id));
  const slots = new Set(pieces.map((piece) => piece.slot));
  return ids.size === PHOTO_PIECE_IDS.length
    && slots.size === PHOTO_PIECE_IDS.length
    && pieces.every((piece) => piece.slot === piece.id && (piece.rotation === undefined || normalizeRotation(piece.rotation) === 0));
}

export function arePhotoHotspotsComplete(found: Iterable<PhotoHotspotId>) {
  const ids = new Set(found);
  return ids.has("ship-number") && ids.has("second-figure");
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
