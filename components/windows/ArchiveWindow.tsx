"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, FileText, Hourglass, LockKeyhole } from "lucide-react";
import { SchedulePuzzle } from "@/components/puzzles/SchedulePuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { archiveDocuments } from "@/lib/case-data";
import { getDocumentVisual, visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";

type MaterialStyle = CSSProperties & Record<"--document-texture" | "--document-position" | "--folder-texture", string>;

export function ArchiveWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const readIds = useCaseStore((state) => state.readDocumentIds);
  const runCount = useCaseStore((state) => state.runCount);
  const code = useCaseStore((state) => state.investigatorCode);
  const markDocumentRead = useCaseStore((state) => state.markDocumentRead);
  const markEvidenceRead = useCaseStore((state) => state.markEvidenceRead);
  const intent = useWindowStore((state) => state.pendingIntents.archive);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const [initialIntent] = useState(() => useWindowStore.getState().pendingIntents.archive);
  const [tab, setTab] = useState<"documents" | "schedule">(initialIntent?.tab === "schedule" ? "schedule" : "documents");
  const [selectedId, setSelectedId] = useState(() => {
    const requested = archiveDocuments.find((doc) => doc.id === initialIntent?.focusId);
    return requested && (!requested.unlockAfter || completed.includes(requested.unlockAfter)) ? requested.id : "doc-case";
  });
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const selected = useMemo(() => archiveDocuments.find((doc) => doc.id === selectedId) ?? archiveDocuments[0], [selectedId]);
  const visual = getDocumentVisual(selected.id);

  const unlocked = (required?: string) => !required || completed.includes(required as never);
  const openDocument = (id: string) => {
    const doc = archiveDocuments.find((item) => item.id === id);
    if (!doc || !unlocked(doc.unlockAfter)) return;
    setSelectedId(id);
    markDocumentRead(id);
    markEvidenceRead(doc.evidenceId);
    setDirectoryOpen(false);
  };

  useEffect(() => {
    if (tab === "documents") {
      markDocumentRead(selected.id);
      markEvidenceRead(selected.evidenceId);
    }
  }, [markDocumentRead, markEvidenceRead, selected.evidenceId, selected.id, tab]);

  useEffect(() => {
    if (!intent) return;
    const frame = window.requestAnimationFrame(() => {
      if (intent.tab === "documents" || intent.tab === "schedule") setTab(intent.tab);
      if (intent.focusId) {
        const requested = archiveDocuments.find((doc) => doc.id === intent.focusId);
        if (requested && (!requested.unlockAfter || completed.includes(requested.unlockAfter))) {
          setSelectedId(requested.id);
          setTab("documents");
        }
      }
      consumeIntent("archive", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [completed, consumeIntent, intent]);

  const materialStyle: MaterialStyle = {
    "--document-texture": `url(${visual.src})`,
    "--document-position": visual.position,
    "--folder-texture": `url(${visualAssets.documents.folder})`,
  };

  return (
    <WindowFrame id="archive" title="案件档案" index="A-01" className="wide-window">
      <div className="window-tabs"><button type="button" className={tab === "documents" ? "is-active" : ""} onClick={() => setTab("documents")}><FileText size={14} /> 档案目录</button><button type="button" className={tab === "schedule" ? "is-active" : ""} onClick={() => setTab("schedule")}><Hourglass size={14} /> 时间比对 {completed.includes("schedule") && <Check size={13} />}</button></div>
      {tab === "schedule" ? <SchedulePuzzle /> : (
        <>
          <button type="button" className="archive-directory-toggle" aria-expanded={directoryOpen} onClick={() => setDirectoryOpen((value) => !value)}><FileText size={16} /> 档案目录 <ChevronDown size={16} aria-hidden="true" /></button>
          <div className={`archive-layout ${directoryOpen ? "is-directory-open" : ""}`}>
          <aside className="folder-list" aria-label="案件档案目录">
            <div className="folder-label material-folder-label" style={materialStyle}><span>CASE</span><strong>P-07-0712</strong><small>{readIds.length}/{archiveDocuments.length} 已阅</small></div>
            {archiveDocuments.map((doc) => {
              const available = unlocked(doc.unlockAfter);
              return <button type="button" key={doc.id} disabled={!available} onClick={() => openDocument(doc.id)} className={`${selected.id === doc.id ? "is-selected" : ""} ${readIds.includes(doc.id) ? "is-read" : ""}`}><span>{doc.code}</span><strong>{doc.title}</strong><small>{available ? doc.category : "索引未恢复"}</small>{!available && <LockKeyhole size={13} />}</button>;
            })}
          </aside>
          <article className={`document-sheet material-document material-${visual.material}`} style={materialStyle}>
            <div className="document-material" aria-hidden="true" />
            <div className="paper-clip" aria-hidden="true" /><header><span>{selected.category}</span><em>{selected.date}</em></header><p className="document-code">{selected.code}</p><h2>{selected.title}</h2><p className="document-byline">记录人：{selected.author.replace("{{code}}", code)}</p><blockquote>{selected.excerpt}</blockquote>
            <div className="document-body">{selected.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}</div>
            {runCount >= 2 && selected.secondRunNote && <aside className="second-run-note"><span>后出现的铅笔批注</span>{selected.secondRunNote.replaceAll("{{code}}", code)}</aside>}
            <footer><span>档案完整性 / {readIds.includes(selected.id) ? "已阅" : "未阅"}</span><strong>MGPA ARCHIVE</strong></footer>
          </article>
          </div>
        </>
      )}
    </WindowFrame>
  );
}
