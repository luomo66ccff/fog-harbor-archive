import type {
  DeductionPlacement,
  DeductionPlacementEvaluation,
  DeductionSlotId,
  DeductionTokenDefinition,
  FrequencySignalState,
  PhotoHotspotId,
  PhotoPieceState,
  PhotoScanStep,
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

interface MutableValue<T> {
  current: T;
}

export function scheduleOneShotTimer(
  timerRef: MutableValue<number | null>,
  queuedRef: MutableValue<boolean>,
  disposedRef: MutableValue<boolean>,
  onComplete: () => void,
  schedule: (callback: () => void, delay: number) => number,
  delay = 520,
) {
  if (queuedRef.current || disposedRef.current) return false;
  queuedRef.current = true;
  let timerId = -1;
  timerId = schedule(() => {
    if (disposedRef.current || timerRef.current !== timerId) return;
    timerRef.current = null;
    onComplete();
  }, delay);
  timerRef.current = timerId;
  return true;
}

export function cancelOneShotTimer(
  timerRef: MutableValue<number | null>,
  disposedRef: MutableValue<boolean>,
  clear: (timerId: number) => void,
) {
  disposedRef.current = true;
  if (timerRef.current === null) return;
  clear(timerRef.current);
  timerRef.current = null;
}

export const PHOTO_SCAN_SEQUENCE: readonly (PhotoHotspotId | null)[] = [
  null,
  "ship-number",
  null,
  null,
  "second-figure",
  null,
] as const;

export function nextPhotoScanStep(
  currentIndex: number,
  assistedInvestigation = false,
): PhotoScanStep {
  const index = (currentIndex + 1) % PHOTO_SCAN_SEQUENCE.length;
  const highlightedHotspot = PHOTO_SCAN_SEQUENCE[index];
  return {
    index,
    highlightedHotspot,
    confirmedHotspot: assistedInvestigation ? highlightedHotspot : null,
  };
}

export const deductionSlots = ["person", "time", "place", "action", "motive"] as const satisfies readonly DeductionSlotId[];

export const deductionTokens = [
  { id: "zhou-jiming", label: "周既明", category: "person" },
  { id: "gu-weian", label: "顾惟安", category: "person" },
  { id: "xu-wancheng", label: "许晚澄", category: "person" },
  { id: "00:31", label: "00:31", category: "time" },
  { id: "00:39", label: "00:39", category: "time" },
  { id: "01:07", label: "01:07", category: "time" },
  { id: "loc-control", label: "监控室", category: "place" },
  { id: "loc-pier7", label: "第七码头", category: "place" },
  { id: "loc-weather", label: "气象站", category: "place" },
  { id: "clock-shift", label: "快调系统主时钟", category: "action" },
  { id: "erase-rain", label: "删除原始天气", category: "action" },
  { id: "open-gate", label: "打开七号外闸", category: "action" },
  { id: "hide-heron", label: "掩盖白鹭七号靠泊", category: "motive" },
  { id: "fake-call", label: "伪造家属通话", category: "motive" },
  { id: "protect-lin", label: "保护林知夏离港", category: "motive" },
] as const satisfies readonly DeductionTokenDefinition[];

const deductionTokenById = new Map<string, DeductionTokenDefinition>(
  deductionTokens.map((token) => [token.id, token]),
);

export function getDeductionToken(tokenId: string) {
  return deductionTokenById.get(tokenId);
}

export const deductionAnswer: Record<DeductionSlotId, string> = {
  person: "zhou-jiming",
  time: "00:31",
  place: "loc-control",
  action: "clock-shift",
  motive: "hide-heron",
};

export function placeDeductionToken(
  values: DeductionPlacement,
  tokenId: string,
  targetSlot: DeductionSlotId,
): DeductionPlacement {
  if (!getDeductionToken(tokenId) || !deductionSlots.includes(targetSlot)) return { ...values };
  const next = { ...values };
  for (const slot of deductionSlots) {
    if (next[slot] === tokenId) delete next[slot];
  }
  next[targetSlot] = tokenId;
  return next;
}

export function evaluateDeductionPlacement(values: DeductionPlacement): DeductionPlacementEvaluation {
  let typeErrors = 0;
  let logicErrors = 0;

  for (const slot of deductionSlots) {
    const tokenId = values[slot];
    if (!tokenId) {
      logicErrors += 1;
      continue;
    }
    const token = getDeductionToken(tokenId);
    if (!token || token.category !== slot) {
      typeErrors += 1;
      continue;
    }
    if (tokenId !== deductionAnswer[slot]) logicErrors += 1;
  }

  return { typeErrors, logicErrors };
}

export function shouldRevealDeductionTypes(failedSubmissions: number) {
  return Number.isFinite(failedSubmissions) && failedSubmissions >= 2;
}

export function isDeductionSolved(values: DeductionPlacement) {
  const result = evaluateDeductionPlacement(values);
  return result.typeErrors === 0 && result.logicErrors === 0;
}
