"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Check, FileSearch, GitCompareArrows, Grid2X2, Link2, List, MessageSquareText, Pin, ShieldCheck,
} from "lucide-react";
import { ProvisionalTheory } from "@/components/narrative/ProvisionalTheory";
import { DeductionPuzzle } from "@/components/puzzles/DeductionPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { evidence } from "@/lib/evidence-data";
import { evaluateEvidenceReview, getVerifiedEvidenceIds } from "@/lib/evidence-engine";
import { criticalEvidenceCount } from "@/lib/ending-engine";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";
import type { EvidenceRelationKind, EvidenceVerdict } from "@/types/evidence";

const verdictLabels: Record<EvidenceVerdict, string> = { unmarked: "未标记", credible: "可信", doubtful: "存疑", forged: "伪造" };

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function mobileSnapshot() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function serverMobileSnapshot() {
  return false;
}

export function EvidenceWindow() {
  const unlockedIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readIds = useCaseStore((state) => state.readEvidenceIds);
  const verdicts = useCaseStore((state) => state.evidenceVerdicts);
  const notes = useCaseStore((state) => state.evidenceNotes);
  const relations = useCaseStore((state) => state.evidenceRelations);
  const touchedIds = useCaseStore((state) => state.evidenceReviewTouchedIds);
  const legacyVerifiedIds = useCaseStore((state) => state.legacyVerifiedEvidenceIds);
  const markRead = useCaseStore((state) => state.markEvidenceRead);
  const setVerdict = useCaseStore((state) => state.setEvidenceVerdict);
  const setNote = useCaseStore((state) => state.setEvidenceNote);
  const toggleRelation = useCaseStore((state) => state.toggleEvidenceRelation);
  const completed = useCaseStore((state) => state.completedPuzzles);
  const intent = useWindowStore((state) => state.pendingIntents.evidence);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const [initialIntent] = useState(() => useWindowStore.getState().pendingIntents.evidence);
  const visibleEvidence = useMemo(() => evidence.filter((item) => unlockedIds.includes(item.id)), [unlockedIds]);
  const [tab, setTab] = useState<"board" | "deduction">(
    initialIntent?.tab === "deduction" ? "deduction" : "board",
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const focusId = initialIntent?.focusId;
    return focusId && unlockedIds.includes(focusId) ? focusId : unlockedIds[0] ?? null;
  });
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverMobileSnapshot);
  const [preferredBoardMode, setPreferredBoardMode] = useState<"graph" | "list" | null>(null);
  const boardMode = preferredBoardMode ?? (mobile ? "list" : "graph");
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const drawFrameRef = useRef<number | null>(null);
  const selected = visibleEvidence.find((item) => item.id === selectedId) ?? visibleEvidence[0] ?? null;
  const verifiedIds = useMemo(() => getVerifiedEvidenceIds({
    visibleEvidenceIds: unlockedIds,
    legacyVerifiedEvidenceIds: legacyVerifiedIds,
    touchedEvidenceIds: touchedIds,
    verdicts,
    relations,
  }), [legacyVerifiedIds, relations, touchedIds, unlockedIds, verdicts]);
  const review = selected
    ? evaluateEvidenceReview(selected.id, verdicts[selected.id] ?? "unmarked", relations[selected.id])
    : null;

  useEffect(() => {
    if (!intent) return;
    const frame = window.requestAnimationFrame(() => {
      if (intent.tab === "board" || intent.tab === "deduction") setTab(intent.tab);
      if (intent.focusId && unlockedIds.includes(intent.focusId)) setSelectedId(intent.focusId);
      consumeIntent("evidence", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [consumeIntent, intent, unlockedIds]);

  useEffect(() => {
    if (tab === "board" && selected) markRead(selected.id);
  }, [markRead, selected, tab]);

  const drawConnections = useCallback(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    const bounds = board.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, bounds.width, bounds.height);
    if (!selected || boardMode !== "graph") return;
    const originNode = cardRefs.current[selected.id];
    if (!originNode) return;
    const origin = originNode.getBoundingClientRect();
    const ax = origin.left - bounds.left + origin.width / 2;
    const ay = origin.top - bounds.top + origin.height / 2;
    const explicit = relations[selected.id];
    selected.relatedEvidence.filter((id) => unlockedIds.includes(id)).forEach((id) => {
      const node = cardRefs.current[id];
      if (!node) return;
      const target = node.getBoundingClientRect();
      const bx = target.left - bounds.left + target.width / 2;
      const by = target.top - bounds.top + target.height / 2;
      const contradicts = explicit?.contradicts.includes(id);
      const supports = explicit?.supports.includes(id);
      context.beginPath();
      context.moveTo(ax, ay);
      const sag = Math.min(24, Math.abs(bx - ax) * 0.08 + 6);
      context.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
      context.strokeStyle = contradicts ? "rgba(155, 72, 63, .9)" : supports ? "rgba(116, 151, 122, .9)" : "rgba(122, 70, 55, .7)";
      context.lineWidth = verifiedIds.includes(selected.id) ? 2.2 : 1.5;
      context.setLineDash(contradicts ? [7, 5] : supports ? [] : [3, 4]);
      context.stroke();
    });
    context.setLineDash([]);
  }, [boardMode, relations, selected, unlockedIds, verifiedIds]);

  const scheduleDraw = useCallback(() => {
    if (drawFrameRef.current !== null) return;
    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;
      drawConnections();
    });
  }, [drawConnections]);

  useEffect(() => {
    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    return () => {
      window.removeEventListener("resize", scheduleDraw);
      if (drawFrameRef.current !== null) window.cancelAnimationFrame(drawFrameRef.current);
    };
  }, [scheduleDraw]);

  const selectEvidence = (id: string) => {
    setSelectedId(id);
    markRead(id);
    scheduleDraw();
  };

  const relationButton = (relatedId: string, kind: EvidenceRelationKind, label: string) => {
    const active = relations[selected?.id ?? ""]?.[kind].includes(relatedId) ?? false;
    return <button type="button" className={`relation-choice relation-${kind} ${active ? "is-active" : ""}`} onClick={() => selected && toggleRelation(selected.id, relatedId, kind)} aria-pressed={active}>{label}</button>;
  };

  return (
    <WindowFrame id="evidence" title="证据墙" index={`E-${visibleEvidence.length.toString().padStart(2, "0")}`} className="max-window" variant="cork">
      <div className="window-tabs"><button type="button" className={tab === "board" ? "is-active" : ""} onClick={() => setTab("board")}><Pin size={14} /> 证据墙</button><button type="button" className={tab === "deduction" ? "is-active" : ""} onClick={() => setTab("deduction")}><Link2 size={14} /> 关系推理 {completed.includes("deduction") && <Check size={13} />}</button><span className="review-counter"><ShieldCheck size={13} /> 关键证据已核验 {criticalEvidenceCount(verifiedIds)}/{criticalEvidenceCount(unlockedIds)}</span></div>
      {tab === "deduction" ? <DeductionPuzzle /> : (
        <div className="evidence-layout">
          <div className="evidence-view-toggle" role="group" aria-label="证据显示模式"><button type="button" className={boardMode === "graph" ? "is-active" : ""} onClick={() => setPreferredBoardMode("graph")}><Grid2X2 size={14} /> 图谱</button><button type="button" className={boardMode === "list" ? "is-active" : ""} onClick={() => setPreferredBoardMode("list")}><List size={14} /> 列表</button></div>
          <div className={`cork-board evidence-mode-${boardMode}`} ref={boardRef}>
            <canvas ref={canvasRef} className="evidence-lines" aria-hidden="true" />
            {visibleEvidence.map((item, index) => {
              const related = selected?.relatedEvidence.includes(item.id);
              const verified = verifiedIds.includes(item.id);
              return <motion.button drag={boardMode === "graph"} dragConstraints={boardRef} dragMomentum={false} onDrag={scheduleDraw} onDragEnd={scheduleDraw} type="button" key={item.id} ref={(node) => { cardRefs.current[item.id] = node; }} onClick={() => selectEvidence(item.id)} className={`evidence-card card-type-${item.type} ${selected?.id === item.id ? "is-selected" : ""} ${related ? "is-related" : ""} ${readIds.includes(item.id) ? "is-read" : ""} ${verified ? "is-verified" : ""}`} style={{ rotate: boardMode === "graph" ? `${[-1.2, 0.8, -0.4, 1.1][index % 4]}deg` : "0deg" }}><i className="pin-head" aria-hidden="true" /><span>{item.index} / {item.type}</span><strong>{item.title}</strong><small>{item.source}</small>{verified ? <em>VERIFIED</em> : item.critical ? <em>KEY</em> : null}</motion.button>;
            })}
          </div>
          <aside className="evidence-inspector">
            {selected ? <><header><span>{selected.index}</span><strong>{selected.title}</strong><small>{selected.type.toUpperCase()} / {selected.acquiredAt}</small></header><div className={`evidence-preview preview-${selected.type}`}><FileSearch size={26} /><span>{selected.source}</span></div><p>{selected.description}</p>{(selected.id === "ev-toolbox" || selected.id === "ev-voiceprint") && <ProvisionalTheory correction compact />}<dl><div><dt>时间</dt><dd>{selected.relatedTime}</dd></div><div><dt>人物</dt><dd>{selected.relatedPeople.length ? selected.relatedPeople.join(" / ") : "未确认"}</dd></div><div><dt>地点</dt><dd>{selected.relatedLocations.join(" / ")}</dd></div></dl><fieldset className="verdict-field"><legend>证据判断</legend>{(["credible", "doubtful", "forged"] as EvidenceVerdict[]).map((verdict) => <button type="button" key={verdict} className={(verdicts[selected.id] ?? "unmarked") === verdict ? "is-active" : ""} onClick={() => setVerdict(selected.id, verdict)}>{verdictLabels[verdict]}</button>)}</fieldset><div className={`evidence-review-status ${review?.verified || verifiedIds.includes(selected.id) ? "is-verified" : ""}`} role="status"><ShieldCheck size={15} /><span><strong>{review?.verified || verifiedIds.includes(selected.id) ? "已核验" : "交叉验证中"}</strong>{review?.message}</span></div><label className="evidence-note"><span><MessageSquareText size={14} /> 调查批注</span><textarea value={notes[selected.id] ?? ""} onChange={(event) => setNote(selected.id, event.target.value)} placeholder="记录这条证据与其他线索的关系……" /></label><div className="related-list"><span><GitCompareArrows size={13} /> 选择支持或矛盾证据</span>{selected.relatedEvidence.filter((id) => unlockedIds.includes(id)).map((id) => { const item = evidence.find((entry) => entry.id === id); return item ? <div className="related-review-row" key={id}><button type="button" className="related-evidence-link" onClick={() => selectEvidence(id)}>{item.index} {item.title}</button><div>{relationButton(id, "supports", "支持")}{relationButton(id, "contradicts", "矛盾")}</div></div> : null; })}</div></> : <div className="empty-inspector">选择一张证据卡查看详情与真实关系线。</div>}
          </aside>
        </div>
      )}
    </WindowFrame>
  );
}
