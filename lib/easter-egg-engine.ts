import type { EasterEggId } from "@/types/narrative";

const easterEggIds = [
  "lamp-morse-0712",
  "seven-stamp",
  "mirror-map",
  "rain-trace",
  "archive-acrostic",
  "ghost-channel",
  "second-run-knock",
  "investigator-index",
] as const satisfies readonly EasterEggId[];

const easterEggIdSet = new Set<string>(easterEggIds);

export const archiveAcrosticSequence = [
  "doc-weather",
  "doc-duty",
  "doc-phone",
  "doc-port",
] as const;

export const archiveAcrosticCopy = ["她", "没", "离", "开"] as const;

export function isEasterEggId(value: unknown): value is EasterEggId {
  return typeof value === "string" && easterEggIdSet.has(value);
}

export function isGhostChannelTuned({
  frozen,
  brightness,
  contrast,
}: {
  frozen: boolean;
  brightness: number;
  contrast: number;
}) {
  return frozen
    && Number.isFinite(brightness)
    && brightness >= 38
    && brightness <= 62
    && Number.isFinite(contrast)
    && contrast >= 58
    && contrast <= 82;
}

export function getSevenStampCopy(runCount: number) {
  return runCount >= 2
    ? "你已经知道还有六个。"
    : "第七码头不是第七个节点。";
}

export function getLampMorseCopy(runCount: number) {
  return runCount >= 2
    ? "港灯仍在重复 0-7-1-2；这一次，它像是在等你回应。"
    : "灯光节奏与纸带口令一致：0-7-1-2。";
}

export function isArchiveAcrosticSequence(ids: readonly string[]) {
  let expectedIndex = 0;
  for (const id of ids) {
    if (id === archiveAcrosticSequence[expectedIndex]) expectedIndex += 1;
    if (expectedIndex === archiveAcrosticSequence.length) return true;
  }
  return false;
}

export function nextArchiveAcrosticTrail(
  current: readonly string[],
  documentId: string,
): string[] {
  const validPrefix = current.length <= archiveAcrosticSequence.length
    && current.every((id, index) => id === archiveAcrosticSequence[index]);
  const normalized = validPrefix ? [...current] : [];
  const expected = archiveAcrosticSequence[normalized.length];
  if (documentId === expected) return [...normalized, documentId];
  return documentId === archiveAcrosticSequence[0] ? [documentId] : [];
}

export function recordEasterEggDiscovery(
  ids: readonly EasterEggId[],
  id: EasterEggId,
): EasterEggId[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}
