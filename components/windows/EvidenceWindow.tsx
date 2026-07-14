"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, FileSearch, Link2, MessageSquareText, Pin, ShieldCheck } from "lucide-react";
import { DeductionPuzzle } from "@/components/puzzles/DeductionPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { evidence } from "@/lib/evidence-data";
import { criticalEvidenceCount } from "@/lib/ending-engine";
import { useCaseStore } from "@/store/case-store";
import type { EvidenceVerdict } from "@/types/evidence";

const verdictLabels: Record<EvidenceVerdict, string> = { unmarked: "未标记", credible: "可信", doubtful: "存疑", forged: "伪造" };

export function EvidenceWindow() {
  const unlockedIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readIds = useCaseStore((state) => state.readEvidenceIds);
  const verdicts = useCaseStore((state) => state.evidenceVerdicts);
  const notes = useCaseStore((state) => state.evidenceNotes);
  const markRead = useCaseStore((state) => state.markEvidenceRead);
  const setVerdict = useCaseStore((state) => state.setEvidenceVerdict);
  const setNote = useCaseStore((state) => state.setEvidenceNote);
  const completed = useCaseStore((state) => state.completedPuzzles);
  const [tab, setTab] = useState<"board" | "deduction">("board");
  const [selectedId, setSelectedId] = useState<string | null>(unlockedIds[0] ?? null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleEvidence = useMemo(() => evidence.filter((item) => unlockedIds.includes(item.id)), [unlockedIds]);
  const selected = visibleEvidence.find((item) => item.id === selectedId) ?? null;

  const drawConnections = useCallback(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas || !selected) return;
    const bounds = board.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, bounds.width, bounds.height);
    const originNode = cardRefs.current[selected.id];
    if (!originNode) return;
    const origin = originNode.getBoundingClientRect();
    const ax = origin.left - bounds.left + origin.width / 2;
    const ay = origin.top - bounds.top + origin.height / 2;
    selected.relatedEvidence.filter((id) => unlockedIds.includes(id)).forEach((id) => {
      const node = cardRefs.current[id];
      if (!node) return;
      const target = node.getBoundingClientRect();
      const bx = target.left - bounds.left + target.width / 2;
      const by = target.top - bounds.top + target.height / 2;
      context.beginPath();
      context.moveTo(ax, ay);
      const sag = Math.min(24, Math.abs(bx - ax) * 0.08 + 6);
      context.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
      context.strokeStyle = "rgba(116, 38, 31, .72)";
      context.lineWidth = 1.5;
      context.stroke();
    });
  }, [selected, unlockedIds]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(drawConnections);
    window.addEventListener("resize", drawConnections);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", drawConnections); };
  }, [drawConnections, layoutVersion]);

  const selectEvidence = (id: string) => {
    setSelectedId(id);
    markRead(id);
    window.requestAnimationFrame(drawConnections);
  };

  return (
    <WindowFrame id="evidence" title="证据墙" index={`E-${visibleEvidence.length.toString().padStart(2, "0")}`} className="max-window">
      <div className="window-tabs"><button type="button" className={tab === "board" ? "is-active" : ""} onClick={() => setTab("board")}><Pin size={14} /> 证据墙</button><button type="button" className={tab === "deduction" ? "is-active" : ""} onClick={() => setTab("deduction")}><Link2 size={14} /> 关系推理 {completed.includes("deduction") && <Check size={13} />}</button><span className="review-counter"><ShieldCheck size={13} /> 关键证据已复核 {criticalEvidenceCount(readIds)}/{criticalEvidenceCount(unlockedIds)}</span></div>
      {tab === "deduction" ? <DeductionPuzzle /> : (
        <div className="evidence-layout">
          <div className="cork-board" ref={boardRef}>
            <canvas ref={canvasRef} className="evidence-lines" aria-hidden="true" />
            {visibleEvidence.map((item, index) => {
              const related = selected?.relatedEvidence.includes(item.id);
              return <motion.button drag dragConstraints={boardRef} dragMomentum={false} onDragEnd={() => setLayoutVersion((value) => value + 1)} type="button" key={item.id} ref={(node) => { cardRefs.current[item.id] = node; }} onClick={() => selectEvidence(item.id)} className={`evidence-card card-type-${item.type} ${selectedId === item.id ? "is-selected" : ""} ${related ? "is-related" : ""} ${readIds.includes(item.id) ? "is-read" : ""}`} style={{ rotate: `${[-1.2, 0.8, -0.4, 1.1][index % 4]}deg` }}><i className="pin-head" aria-hidden="true" /><span>{item.index} / {item.type}</span><strong>{item.title}</strong><small>{item.source}</small>{item.critical && <em>KEY</em>}</motion.button>;
            })}
          </div>
          <aside className="evidence-inspector">
            {selected ? <><header><span>{selected.index}</span><strong>{selected.title}</strong><small>{selected.type.toUpperCase()} / {selected.acquiredAt}</small></header><div className="evidence-preview"><FileSearch size={26} /><span>{selected.source}</span></div><p>{selected.description}</p><dl><div><dt>时间</dt><dd>{selected.relatedTime}</dd></div><div><dt>人物</dt><dd>{selected.relatedPeople.length ? selected.relatedPeople.join(" / ") : "未确认"}</dd></div><div><dt>地点</dt><dd>{selected.relatedLocations.join(" / ")}</dd></div></dl><fieldset className="verdict-field"><legend>证据判断</legend>{(["credible", "doubtful", "forged"] as EvidenceVerdict[]).map((verdict) => <button type="button" key={verdict} className={(verdicts[selected.id] ?? "unmarked") === verdict ? "is-active" : ""} onClick={() => setVerdict(selected.id, verdict)}>{verdictLabels[verdict]}</button>)}</fieldset><label className="evidence-note"><span><MessageSquareText size={14} /> 调查批注</span><textarea value={notes[selected.id] ?? ""} onChange={(event) => setNote(selected.id, event.target.value)} placeholder="记录这条证据与其他线索的关系……" /></label><div className="related-list"><span>关系线连接</span>{selected.relatedEvidence.filter((id) => unlockedIds.includes(id)).map((id) => { const item = evidence.find((entry) => entry.id === id); return item ? <button type="button" key={id} onClick={() => selectEvidence(id)}>{item.index} {item.title}</button> : null; })}</div></> : <div className="empty-inspector">选择一张证据卡查看详情与真实关系线。</div>}
          </aside>
        </div>
      )}
    </WindowFrame>
  );
}

