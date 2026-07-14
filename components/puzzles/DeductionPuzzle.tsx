"use client";

import { DragEvent, useMemo, useState } from "react";
import { Check, Link2, Paperclip, Search, ShieldAlert, X } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CaseReflection } from "@/components/narrative/CaseReflection";
import { puzzleGuidance } from "@/lib/case-data";
import { evidenceTitle, deductionEvidenceRequirements, evaluateDeductionSubmission, getVerifiedEvidenceIds } from "@/lib/evidence-engine";
import { deductionSlots, deductionTokens, getDeductionToken, placeDeductionToken, shouldRevealDeductionTypes } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";
import type { DeductionPlacement } from "@/types/puzzle";

type SlotId = (typeof deductionSlots)[number];

const slotLabels: Record<SlotId, string> = { person: "人物", time: "时间", place: "地点", action: "行为", motive: "目的" };

export function DeductionPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("deduction"));
  const unlockedIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const verdicts = useCaseStore((state) => state.evidenceVerdicts);
  const relations = useCaseStore((state) => state.evidenceRelations);
  const touchedIds = useCaseStore((state) => state.evidenceReviewTouchedIds);
  const legacyVerifiedIds = useCaseStore((state) => state.legacyVerifiedEvidenceIds);
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const markTaskProgress = useCaseStore((state) => state.markTaskProgress);
  const deductionAttempts = useCaseStore((state) => state.puzzleAttempts.deduction ?? 0);
  const assistedInvestigation = useCaseStore((state) => state.assistedInvestigation);
  const { cue } = useFogAudio();
  const [values, setValues] = useState<DeductionPlacement>({});
  const [evidenceBySlot, setEvidenceBySlot] = useState<Partial<Record<SlotId, string[]>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("先自由放置线索，再为每一段附加已核验的交叉证据；系统会在提交时统一报告问题。");
  const [hintIndex, setHintIndex] = useState(-1);
  const showClassification = assistedInvestigation || shouldRevealDeductionTypes(deductionAttempts);
  const verifiedIds = useMemo(() => getVerifiedEvidenceIds({
    visibleEvidenceIds: unlockedIds,
    legacyVerifiedEvidenceIds: legacyVerifiedIds,
    touchedEvidenceIds: touchedIds,
    verdicts,
    relations,
  }), [legacyVerifiedIds, relations, touchedIds, unlockedIds, verdicts]);

  const assign = (tokenId: string, slot: SlotId) => {
    const token = getDeductionToken(tokenId);
    if (!token) {
      setFeedback("这枚线索无法被系统识别，请重新选择。");
      cue("error");
      return;
    }
    setValues((current) => placeDeductionToken(current, tokenId, slot));
    setSelected(null);
    setFeedback(`已将“${token.label}”放入“${slotLabels[slot]}”槽位。系统会在提交时统一检查分类与逻辑。`);
    cue("paper");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, slot: SlotId) => {
    event.preventDefault();
    assign(event.dataTransfer.getData("text/deduction-token"), slot);
  };

  const toggleEvidence = (slot: SlotId, evidenceId: string) => {
    setEvidenceBySlot((current) => {
      const selectedIds = current[slot] ?? [];
      const next = selectedIds.includes(evidenceId)
        ? selectedIds.filter((id) => id !== evidenceId)
        : [...selectedIds, evidenceId];
      return { ...current, [slot]: next };
    });
    markTaskProgress("close-chain", slot);
    cue("paper");
  };

  const validate = () => {
    recordAttempt("deduction");
    const result = evaluateDeductionSubmission(values, evidenceBySlot, verifiedIds, relations);
    if (result.solved) {
      deductionSlots.forEach((slot) => markTaskProgress("close-chain", slot));
      completePuzzle("deduction");
      setFeedback("逻辑链与附加证据同时闭合。最终档案、封存指令与匿名声纹比对已开放。");
      cue("unlock");
      return;
    }
    const classificationReveal = shouldRevealDeductionTypes(deductionAttempts + 1)
      ? " 已开放线索分类标签，可据此重新整理槽位。"
      : " 再失败一次后，系统将开放线索分类标签。";
    setFeedback(`本次提交：分类错位 ${result.typeErrors} 处，逻辑节点错误 ${result.logicErrors} 处，证据支持不足 ${result.evidenceSupportMissing} 段，互相矛盾的附件 ${result.contradictionCount} 组。${classificationReveal}`);
    cue("error");
  };

  if (solved) return <div className="deduction-resolution"><section className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>责任链已闭合</strong><p>五段逻辑均已由独立记录交叉支持。系统不再把所有撒谎者压成同一种责任。</p></div></section><CaseReflection /></div>;

  return (
    <section className="puzzle-panel deduction-puzzle" aria-labelledby="deduction-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 04 / EVIDENCE CHAIN</p><h3 id="deduction-title">证据关系推理</h3></div><Link2 size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">先构成五段责任链，再为每段附加至少一条已经交叉核验的证据。错误判断不会锁死，可以随时回到证据墙修正。</p>
      <div className="deduction-chain">
        {deductionSlots.map((slot, index) => {
          const value = values[slot];
          const token = value ? getDeductionToken(value) : null;
          return <div key={slot} className="chain-wrap"><div className={`chain-slot ${token ? "is-filled" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, slot)}><button type="button" className="chain-slot-target" onClick={() => { if (selected) assign(selected, slot); }}><small>{slotLabels[slot]}</small><strong>{token?.label ?? "放入线索"}</strong></button>{token && <button type="button" className="chain-slot-clear" onClick={() => setValues((current) => ({ ...current, [slot]: undefined }))} aria-label={`清除${slotLabels[slot]}`}><X size={13} /></button>}</div>{index < deductionSlots.length - 1 && <i aria-hidden="true">→</i>}</div>;
        })}
      </div>
      <div className="token-bank" aria-label="可用推理线索">{deductionTokens.map((token) => <button type="button" draggable key={token.id} onDragStart={(event) => event.dataTransfer.setData("text/deduction-token", token.id)} onClick={() => setSelected(token.id)} className={selected === token.id ? "is-selected" : ""} aria-pressed={selected === token.id} aria-label={showClassification ? `${token.label}，分类：${slotLabels[token.category]}` : token.label}><small>{showClassification ? slotLabels[token.category] : "未分类"}</small>{token.label}</button>)}</div>

      <section className="deduction-evidence" aria-labelledby="deduction-evidence-title">
        <header><Paperclip size={16} aria-hidden="true" /><div><strong id="deduction-evidence-title">附加核验证据</strong><span>绿色条目可作为有效支持；灰色条目需要先在证据墙完成判断。</span></div></header>
        <div className="deduction-evidence-grid">{deductionSlots.map((slot) => <fieldset key={slot}><legend>{slotLabels[slot]}</legend>{deductionEvidenceRequirements[slot].filter((id) => unlockedIds.includes(id)).map((id) => { const active = evidenceBySlot[slot]?.includes(id) ?? false; const verified = verifiedIds.includes(id); return <button type="button" key={id} className={`${active ? "is-selected" : ""} ${verified ? "is-verified" : "needs-review"}`} onClick={() => toggleEvidence(slot, id)} aria-pressed={active}><ShieldAlert size={13} aria-hidden="true" /><span>{evidenceTitle(id)}</span><small>{verified ? "已核验" : "待核验"}</small></button>; })}</fieldset>)}</div>
      </section>

      <div className="deduction-footer"><p className="puzzle-feedback" role="status">{feedback}</p><button type="button" className="primary-action" onClick={validate}>验证责任链与附件</button></div>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.deduction.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.deduction[hintIndex]}</p>}
    </section>
  );
}
