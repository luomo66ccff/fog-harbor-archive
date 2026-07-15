import type { EndingId, PuzzleId } from "@/types/case";
import type { EasterEggId } from "@/types/narrative";

const puzzleOrder: readonly PuzzleId[] = ["schedule", "frequency", "photo", "deduction", "hidden"];

const puzzleLabels: Record<PuzzleId, string> = {
  schedule: "时间校准",
  frequency: "纸带解码",
  photo: "照片复原",
  deduction: "责任链推演",
  hidden: "隐藏档案",
};

const endingLabels: Record<EndingId, string> = {
  truth: "公开全部档案",
  trade: "接受匿名交易",
  seventh: "进入隐藏档案",
};

const theoryLabels: Record<string, string> = {
  pursuer: "追捕者",
  rescuer: "救援者",
  unknown: "无法判断",
};

const narrativeLabels: Record<string, string> = {
  "first-time-contradiction": "发现天气记录矛盾",
  "archive-watch-warning": "未知节点读取警告",
  "xuwancheng-false-lead": "气象口令疑点",
  "tape-edit-detected": "磁带剪接痕迹",
  "second-figure-theory": "记录第二道人影判断",
  "theory-correction": "新证据改变了此前推论",
  "gu-weian-payment-context": "补全付款背景",
  "chen-mu-protective-lie": "识别保护性谎言",
  "external-reader-detected": "当前页码已被未知节点同步读取",
  "investigator-index-written": "调查员索引写入",
};

const easterEggLabels: Record<EasterEggId, string> = {
  "lamp-morse-0712": "港灯节律",
  "seven-stamp": "归档印痕",
  "mirror-map": "异常镜像图",
  "rain-trace": "玻璃水迹",
  "archive-acrostic": "档案首字索引",
  "ghost-channel": "C-00 隐藏频道",
  "second-run-knock": "第二轮敲击",
  "investigator-index": "调查员索引",
};

const windowsReservedNames = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const metadataLine = /(?:真实姓名|real\s*name|ip(?:\s*address)?|user[-\s]?agent|设备(?:信息|型号|名称)|device(?:\s*(?:info|model|name))?|mac(?:\s*address)?|操作系统|os\s*version)\s*[:：=][^\r\n]*/gi;
const userAgent = /Mozilla\/5\.0[^\r\n]*/gi;
const macAddress = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi;
const ipv4Address = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const emailAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const mainlandPhone = /\b1[3-9]\d{9}\b/g;
const ipv6Address = /(?<![0-9a-f:])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![0-9a-f:])/gi;
const MAX_DATE_MS = 8_640_000_000_000_000;

export interface InvestigationRunSnapshot {
  runNumber: number;
  startedAt: number;
  endedAt?: number;
  completedPuzzles: readonly PuzzleId[];
  unlockedEvidenceIds: readonly string[];
  readDocumentIds: readonly string[];
  readMessageIds: readonly string[];
  readEvidenceIds: readonly string[];
  evidenceNotes: Readonly<Record<string, string>>;
  caseNote: string;
  puzzleAttempts: Partial<Record<PuzzleId, number>>;
  narrativeEventIds: readonly string[];
  theoryHistory: readonly string[];
  discoveredEasterEggCount: number;
  discoveredEasterEggIds?: readonly EasterEggId[];
  assistedInvestigation: boolean;
  endingId: EndingId | null;
}

export interface InvestigationLogEntry {
  id: string;
  label: string;
  value: string;
}

export interface InvestigationLogRun {
  runNumber: number;
  startedAt: number;
  endedAt?: number;
  playerNotes: InvestigationLogEntry[];
  systemRecords: InvestigationLogEntry[];
}

export interface InvestigationLogDocument {
  caseId: string;
  generatedAt: number;
  runs: InvestigationLogRun[];
}

export interface InvestigationLogInput {
  caseId?: string;
  generatedAt?: number;
  runs: readonly InvestigationRunSnapshot[];
}

export interface InvestigationLogExport {
  filename: string;
  text: string;
  document: InvestigationLogDocument;
}

function finiteTimestamp(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= MAX_DATE_MS
    ? value
    : undefined;
}

function formatTimestamp(value: number | undefined): string {
  const timestamp = finiteTimestamp(value);
  if (!timestamp) return "未记录";
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return "未记录";
  }
}

function formatTheory(value: string): string {
  return value
    .split("->")
    .map((part) => theoryLabels[part] ?? part)
    .join(" → ");
}

function normalizedCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function redactSensitiveMetadata(value: string): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(controlCharacters, "")
    .replace(metadataLine, "[已移除敏感元数据]")
    .replace(userAgent, "[已移除 User-Agent]")
    .replace(macAddress, "[已移除设备地址]")
    .replace(ipv4Address, "[已移除 IP]")
    .replace(ipv6Address, "[已移除 IP]")
    .replace(emailAddress, "[已移除联系信息]")
    .replace(mainlandPhone, "[已移除联系信息]")
    .trim()
    .slice(0, 12_000);
}

export function sanitizeLogFilename(value: string, fallback = "fog-harbor-investigation-log"): string {
  const safeFallback = fallback
    .normalize("NFKC")
    .replace(/\s+$/g, "")
    .replace(/(?:\.txt)+$/i, "")
    .replace(controlCharacters, "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72) || "fog-harbor-investigation-log";
  let stem = String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+$/g, "")
    .replace(/(?:\.txt)+$/i, "")
    .replace(controlCharacters, "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
  if (!stem || windowsReservedNames.test(stem.split(".")[0] ?? stem)) stem = safeFallback;
  return `${stem}.txt`;
}

function playerNotesForRun(run: InvestigationRunSnapshot): InvestigationLogEntry[] {
  const entries: InvestigationLogEntry[] = [];
  const caseNote = redactSensitiveMetadata(run.caseNote);
  if (caseNote) entries.push({ id: "case-note", label: "调查员自由笔记", value: caseNote });
  Object.entries(run.evidenceNotes)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([id, note]) => {
      const value = redactSensitiveMetadata(note);
      const safeId = redactSensitiveMetadata(id).replace(/\s+/g, " ").slice(0, 120) || "未知证据";
      if (value) entries.push({ id: `evidence-note-${safeId}`, label: `证据批注 ${safeId}`, value });
    });
  return entries;
}

function systemRecordsForRun(run: InvestigationRunSnapshot): InvestigationLogEntry[] {
  const completed = puzzleOrder
    .filter((id) => run.completedPuzzles.includes(id))
    .map((id) => puzzleLabels[id]);
  const attempts = puzzleOrder
    .map((id) => [id, normalizedCount(run.puzzleAttempts[id] ?? 0)] as const)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${puzzleLabels[id]} ×${count}`);
  const theories = run.theoryHistory.map(formatTheory).map(redactSensitiveMetadata).filter(Boolean);
  const narratives = run.narrativeEventIds
    .map((id) => narrativeLabels[id] ?? redactSensitiveMetadata(id))
    .filter(Boolean);
  const easterEggs = (run.discoveredEasterEggIds ?? [])
    .map((id) => easterEggLabels[id])
    .filter(Boolean);
  const ending = run.endingId ? endingLabels[run.endingId] : "尚未抵达结局";
  return [
    { id: "started-at", label: "本轮开始", value: formatTimestamp(run.startedAt) },
    ...(finiteTimestamp(run.endedAt)
      ? [{ id: "ended-at", label: "本轮结束", value: formatTimestamp(run.endedAt) }]
      : []),
    { id: "completed-puzzles", label: "完成谜题", value: completed.join("、") || "无" },
    { id: "puzzle-attempts", label: "谜题尝试", value: attempts.join("、") || "无" },
    { id: "documents-read", label: "已读档案", value: `${run.readDocumentIds.length} 份` },
    { id: "messages-read", label: "已读消息", value: `${run.readMessageIds.length} 条` },
    { id: "evidence-read", label: "已读证据", value: `${run.readEvidenceIds.length} 条` },
    { id: "evidence-unlocked", label: "已恢复证据", value: `${run.unlockedEvidenceIds.length} 条` },
    { id: "narrative-events", label: "系统叙事记录", value: narratives.join("；") || "无" },
    { id: "theory-history", label: "临时推理", value: theories.join("；") || "未记录" },
    { id: "easter-eggs", label: "隐藏发现", value: easterEggs.length > 0
      ? easterEggs.join("、")
      : `${normalizedCount(run.discoveredEasterEggCount)} 项` },
    { id: "assistance", label: "辅助调查", value: run.assistedInvestigation ? "已启用" : "未启用" },
    { id: "ending", label: "本轮结局", value: ending },
  ];
}

export function buildInvestigationLog(input: InvestigationLogInput): InvestigationLogDocument {
  const runs = [...input.runs]
    .map((run) => ({
      runNumber: Math.max(1, Math.trunc(run.runNumber) || 1),
      startedAt: finiteTimestamp(run.startedAt) ?? 0,
      endedAt: finiteTimestamp(run.endedAt),
      playerNotes: playerNotesForRun(run),
      systemRecords: systemRecordsForRun(run),
    }))
    .sort((left, right) => left.runNumber - right.runNumber || left.startedAt - right.startedAt);
  return {
    caseId: redactSensitiveMetadata(input.caseId ?? "P-07-0712") || "P-07-0712",
    generatedAt: finiteTimestamp(input.generatedAt) ?? 0,
    runs,
  };
}

function entryLines(entry: InvestigationLogEntry): string[] {
  const valueLines = redactSensitiveMetadata(entry.value).split("\n");
  const [first = "", ...rest] = valueLines;
  const label = redactSensitiveMetadata(entry.label).replace(/\s+/g, " ") || "记录";
  return [`- ${label}: ${first}`, ...rest.map((line) => `  ${line}`)];
}

export function serializeInvestigationLog(document: InvestigationLogDocument): string {
  const lines = [
    "雾港档案 / 调查日志",
    `案件编号: ${redactSensitiveMetadata(document.caseId)}`,
    ...(finiteTimestamp(document.generatedAt) ? [`导出时间: ${formatTimestamp(document.generatedAt)}`] : []),
    "隐私说明: 本文件不写入真实身份、IP、User-Agent 或设备信息。",
  ];
  for (const run of document.runs) {
    lines.push("", `=== RUN ${String(run.runNumber).padStart(2, "0")} ===`);
    lines.push("", "[玩家笔记]");
    if (run.playerNotes.length === 0) lines.push("- 本轮未写入玩家笔记");
    else run.playerNotes.forEach((entry) => lines.push(...entryLines(entry)));
    lines.push("", "[系统记录]");
    run.systemRecords.forEach((entry) => lines.push(...entryLines(entry)));
  }
  return `${lines.join("\n")}\n`;
}

export function createInvestigationLogExport(
  input: InvestigationLogInput,
  suggestedFilename = "fog-harbor-investigation-log",
): InvestigationLogExport {
  const document = buildInvestigationLog(input);
  return {
    filename: sanitizeLogFilename(suggestedFilename),
    text: serializeInvestigationLog(document),
    document,
  };
}
