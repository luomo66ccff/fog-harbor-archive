"use client";

import { useState } from "react";
import { Check, FileSearch, Scale } from "lucide-react";
import { claimDefinitions, mainClaimIds } from "@/lib/claim-data";
import { evaluateClaim, getProvenClaimIds } from "@/lib/claim-engine";
import { evidence } from "@/lib/evidence-data";
import { useCaseStore } from "@/store/case-store";
import type { ClaimId, ClaimSubmission } from "@/types/investigation";

const blank: ClaimSubmission = { propositionId: "", evidenceIds: [], rebuttalChoiceId: "" };

function ClaimForm({ id }: { id: ClaimId }) {
  const submissions = useCaseStore((state) => state.claimSubmissions);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const discoveredAnonymous = useCaseStore((state) => state.discoveredAnonymous);
  const markRead = useCaseStore((state) => state.markEvidenceRead);
  const submitClaim = useCaseStore((state) => state.submitClaim);
  const saveClaimDraft = useCaseStore((state) => state.saveClaimDraft);
  const [draft, setDraft] = useState<ClaimSubmission>(() => useCaseStore.getState().claimDrafts[id] ?? submissions[id] ?? blank);
  const [feedback, setFeedback] = useState("");
  const definition = claimDefinitions.find((item) => item.id === id)!;
  const context = { unlockedEvidenceIds, readEvidenceIds, completedPuzzles, discoveredAnonymous };
  const proven = getProvenClaimIds(submissions, context);
  const established = proven.includes(id);
  const locked = id === "archive02-continuity" && (!discoveredAnonymous || !completedPuzzles.includes("hidden") || !mainClaimIds.every((claim) => proven.includes(claim)));
  const visible = evidence.filter((item) => unlockedEvidenceIds.includes(item.id));
  const updateDraft = (changes: Partial<ClaimSubmission>) => {
    const next = { ...draft, ...changes, migrated: false };
    setDraft(next);
    saveClaimDraft(id, next);
  };
  const attach = (evidenceId: string, checked: boolean) => updateDraft({
    evidenceIds: checked ? [...new Set([...draft.evidenceIds, evidenceId])] : draft.evidenceIds.filter((item) => item !== evidenceId),
  });
  const submit = () => {
    const result = evaluateClaim(id, { ...draft, migrated: false }, { ...context, provenClaimIds: proven });
    submitClaim(id, { ...draft, migrated: false });
    setFeedback(result.feedback);
  };

  return <article className="claim-form" data-claim-id={id}>
    <header><p className="eyebrow">CONFRONTATION / {definition.title}</p><h3>{definition.question}</h3>
      {established && <p className="claim-established"><Check size={16} /> 此项对质已成立{submissions[id]?.migrated ? " · 已保留旧版解谜成果" : ""}</p>}
      <p>选择能解释全部材料的命题。展开原文后可附入证据，也要保留并回应最强的反方材料。</p>
    </header>
    {locked ? <p className="claim-locked">完成前三项对质、确认匿名委托人并解开地图镜像口令后，可比对 ARCHIVE-02 的作业指纹。</p> : <>
      <fieldset className="claim-propositions"><legend>01 / 提出解释</legend>{definition.propositions.map((item) => <label key={item.id}>
        <input type="radio" name={`proposition-${id}`} value={item.id} checked={draft.propositionId === item.id} onChange={() => updateDraft({ propositionId: item.id })} />
        <span>{item.label}</span>
      </label>)}</fieldset>
      <section className="claim-source-section" aria-label="对质证据"><div className="claim-source-heading"><h4><FileSearch size={16} /> 02 / 查阅并附入证据</h4><span>已附入 {draft.evidenceIds.length} 份</span></div>
        <p>不同来源才能互相印证；同一照片的放大结果不算独立来源。尚未解锁的材料会随调查出现。</p>
        <div className="claim-sources">{visible.map((item) => <details key={item.id} data-source-id={item.id} onToggle={(event) => { if (event.currentTarget.open) markRead(item.id); }}>
          <summary><span>{item.index} · {item.title}</span>{draft.evidenceIds.includes(item.id) && <Check size={14} />}</summary>
          <p className="claim-source-origin">来源：{item.source} · {item.relatedTime}</p><p>{item.description}</p>
          <label className="claim-attachment"><input type="checkbox" checked={draft.evidenceIds.includes(item.id)} onChange={(event) => { markRead(item.id); attach(item.id, event.target.checked); }} /> 将{item.title}附入本项对质</label>
        </details>)}</div>
      </section>
      <fieldset className="claim-rebuttal"><legend>03 / 回应反方材料</legend><blockquote>{definition.rebuttal.text}</blockquote>{definition.rebuttal.choices.map((item) => <label key={item.id}>
        <input type="radio" name={`rebuttal-${id}`} value={item.id} checked={draft.rebuttalChoiceId === item.id} onChange={() => updateDraft({ rebuttalChoiceId: item.id })} /><span>{item.label}</span>
      </label>)}</fieldset>
      <button className="primary-action claim-submit" type="button" onClick={submit}><Scale size={16} /> 提交本项对质</button>
      {feedback && <p className="claim-feedback" role="status">{feedback}</p>}
    </>}
  </article>;
}

export function ClaimBoard() {
  const [active, setActive] = useState<ClaimId>("clock-fabrication");
  const submissions = useCaseStore((state) => state.claimSubmissions);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const discoveredAnonymous = useCaseStore((state) => state.discoveredAnonymous);
  const proven = getProvenClaimIds(submissions, { unlockedEvidenceIds, readEvidenceIds, completedPuzzles, discoveredAnonymous });
  return <section className="claim-board" aria-label="关键对质">
    <div className="claim-board-heading"><p className="eyebrow">EVIDENCE / COUNTEREVIDENCE</p><h2>让每一个结论经得起反问</h2><p>主线对质 {mainClaimIds.filter((id) => proven.includes(id)).length} / 3 · 隐藏调查 {proven.includes("archive02-continuity") ? "已成立" : "待核查"}</p></div>
    <nav className="claim-navigation" aria-label="选择对质议题">{claimDefinitions.map((item, index) => <button type="button" key={item.id} data-claim-tab={item.id} aria-pressed={active === item.id} onClick={() => setActive(item.id)}><small>0{index + 1}</small><span>{item.title}</span>{proven.includes(item.id) && <Check size={16} />}</button>)}</nav>
    <ClaimForm key={active} id={active} />
  </section>;
}
