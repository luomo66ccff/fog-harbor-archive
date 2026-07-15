"use client";

import { useId, useMemo } from "react";
import { Download, FileClock, NotebookPen, ShieldCheck } from "lucide-react";
import {
  buildInvestigationLog,
  createInvestigationLogExport,
  type InvestigationLogExport,
  type InvestigationRunSnapshot,
} from "@/lib/investigation-log";
import { useCaseStore } from "@/store/case-store";

interface InvestigationLogProps {
  runs?: readonly InvestigationRunSnapshot[];
  compact?: boolean;
  showExport?: boolean;
  onExport?: (result: InvestigationLogExport) => void;
}

export function InvestigationLog({
  runs,
  compact = false,
  showExport = true,
  onExport,
}: InvestigationLogProps) {
  const headingId = useId();
  const investigatorCode = useCaseStore((state) => state.investigatorCode);
  const runNumber = useCaseStore((state) => state.runCount);
  const startedAt = useCaseStore((state) => state.runStartedAt);
  const endedAt = useCaseStore((state) => state.runEndedAt ?? undefined);
  const runHistory = useCaseStore((state) => state.runHistory);
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readDocumentIds = useCaseStore((state) => state.readDocumentIds);
  const readMessageIds = useCaseStore((state) => state.readMessageIds);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const evidenceNotes = useCaseStore((state) => state.evidenceNotes);
  const caseNote = useCaseStore((state) => state.caseNote);
  const puzzleAttempts = useCaseStore((state) => state.puzzleAttempts);
  const narrativeEventIds = useCaseStore((state) => state.runNarrativeEventIds);
  const theoryHistory = useCaseStore((state) => state.theoryHistory);
  const discoveredEasterEggCount = useCaseStore((state) => state.runDiscoveredEasterEggIds.length);
  const discoveredEasterEggIds = useCaseStore((state) => state.runDiscoveredEasterEggIds);
  const assistedInvestigation = useCaseStore((state) => state.assistedInvestigation);
  const endingId = useCaseStore((state) => state.currentEnding);

  const currentRun = useMemo<InvestigationRunSnapshot>(() => ({
    runNumber,
    startedAt,
    endedAt,
    completedPuzzles,
    unlockedEvidenceIds,
    readDocumentIds,
    readMessageIds,
    readEvidenceIds,
    evidenceNotes,
    caseNote,
    puzzleAttempts,
    narrativeEventIds,
    theoryHistory,
    discoveredEasterEggCount,
    discoveredEasterEggIds,
    assistedInvestigation,
    endingId,
  }), [
    assistedInvestigation,
    caseNote,
    completedPuzzles,
    discoveredEasterEggCount,
    discoveredEasterEggIds,
    endedAt,
    endingId,
    evidenceNotes,
    narrativeEventIds,
    puzzleAttempts,
    readDocumentIds,
    readEvidenceIds,
    readMessageIds,
    runNumber,
    startedAt,
    theoryHistory,
    unlockedEvidenceIds,
  ]);
  const visibleRuns = useMemo(() => {
    if (runs) return [...runs];
    const currentAlreadyArchived = runHistory.some((run) => run.runNumber === currentRun.runNumber);
    return currentAlreadyArchived ? [...runHistory] : [...runHistory, currentRun];
  }, [currentRun, runHistory, runs]);
  const logDocument = useMemo(() => buildInvestigationLog({ runs: visibleRuns }), [visibleRuns]);

  const exportLog = () => {
    const result = createInvestigationLogExport(
      { runs: visibleRuns },
      `fog-harbor-investigation-${investigatorCode || "ARCHIVE-07"}`,
    );
    const url = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.rel = "noopener";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    onExport?.(result);
  };

  return (
    <section className={`investigation-log ${compact ? "is-compact" : ""}`} aria-labelledby={headingId}>
      <header className="investigation-log__header">
        <div><FileClock size={18} aria-hidden="true" /><div><span>LOCAL CASE HISTORY</span><h2 id={headingId}>本轮调查日志</h2></div></div>
        {showExport && <button type="button" onClick={exportLog}><Download size={15} aria-hidden="true" /> 导出纯文本</button>}
      </header>
      <p className="investigation-log__privacy"><ShieldCheck size={14} aria-hidden="true" /> 导出内容仅含案件操作与玩家笔记；不会读取或写入真实身份、IP、User-Agent、设备信息。</p>
      <div className="investigation-log__runs">
        {logDocument.runs.map((run) => (
          <article className="investigation-log__run" key={`${run.runNumber}:${run.startedAt}`} data-run-number={run.runNumber}>
            <header><span>RUN {String(run.runNumber).padStart(2, "0")}</span><strong>{run.systemRecords.find((entry) => entry.id === "ending")?.value ?? "调查中"}</strong></header>
            <section className="investigation-log__player-notes" aria-label={`第 ${run.runNumber} 轮玩家笔记`}>
              <h3><NotebookPen size={15} aria-hidden="true" /> 玩家笔记</h3>
              {run.playerNotes.length === 0 ? <p>本轮未写入玩家笔记。</p> : (
                <dl>{run.playerNotes.map((entry) => <div key={entry.id}><dt>{entry.label}</dt><dd><pre>{entry.value}</pre></dd></div>)}</dl>
              )}
            </section>
            <section className="investigation-log__system-records" aria-label={`第 ${run.runNumber} 轮系统记录`}>
              <h3><FileClock size={15} aria-hidden="true" /> 系统记录</h3>
              <dl>{run.systemRecords.map((entry) => <div key={entry.id}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
            </section>
          </article>
        ))}
      </div>
    </section>
  );
}
