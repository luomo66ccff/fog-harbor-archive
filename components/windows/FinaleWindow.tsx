"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, Eye, FileWarning, Radio, Send, Trash2 } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CaseReflection } from "@/components/narrative/CaseReflection";
import { ProvisionalTheory } from "@/components/narrative/ProvisionalTheory";
import { HiddenPuzzle } from "@/components/puzzles/HiddenPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { archiveDocuments, endings } from "@/lib/case-data";
import { getVerifiedEvidenceIds } from "@/lib/evidence-engine";
import { getEndingAvailability } from "@/lib/ending-engine";
import { useCaseStore } from "@/store/case-store";
import type { EndingId } from "@/types/case";

const candidates = [
  { id: "tang-zhi", label: "唐芷", note: "最后通话的接听者" },
  { id: "lin-zhixia", label: "林知夏", note: "法定状态仍为失踪" },
  { id: "xu-wancheng", label: "许晚澄", note: "保留了原始天气缓存" },
];

export function FinaleWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const verdicts = useCaseStore((state) => state.evidenceVerdicts);
  const relations = useCaseStore((state) => state.evidenceRelations);
  const touchedIds = useCaseStore((state) => state.evidenceReviewTouchedIds);
  const legacyVerifiedIds = useCaseStore((state) => state.legacyVerifiedEvidenceIds);
  const anonymous = useCaseStore((state) => state.discoveredAnonymous);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const code = useCaseStore((state) => state.investigatorCode);
  const identifyAnonymous = useCaseStore((state) => state.identifyAnonymous);
  const chooseEnding = useCaseStore((state) => state.chooseEnding);
  const markEvidenceRead = useCaseStore((state) => state.markEvidenceRead);
  const markDocumentRead = useCaseStore((state) => state.markDocumentRead);
  const { cue } = useFogAudio();
  const [candidate, setCandidate] = useState("");
  const [identityFeedback, setIdentityFeedback] = useState("");
  const finalDoc = archiveDocuments.find((doc) => doc.id === "doc-final")!;

  useEffect(() => {
    markDocumentRead("doc-final");
    markEvidenceRead("ev-final-chain");
  }, [markDocumentRead, markEvidenceRead]);

  const verifiedEvidenceIds = useMemo(() => getVerifiedEvidenceIds({
    visibleEvidenceIds: unlockedEvidenceIds,
    legacyVerifiedEvidenceIds: legacyVerifiedIds,
    touchedEvidenceIds: touchedIds,
    verdicts,
    relations,
  }), [legacyVerifiedIds, relations, touchedIds, unlockedEvidenceIds, verdicts]);
  const context = useMemo(() => ({ completedPuzzles: completed, unlockedEvidenceIds, readEvidenceIds: verifiedEvidenceIds, discoveredAnonymous: anonymous }), [anonymous, completed, unlockedEvidenceIds, verifiedEvidenceIds]);
  const availability = getEndingAvailability(context);

  const verifyIdentity = () => {
    if (candidate === "lin-zhixia") {
      identifyAnonymous();
      markEvidenceRead("ev-voiceprint");
      setIdentityFeedback("声纹、呼吸间隔与陈牧的检修梯证词吻合：潮汐_0 就是活下来的林知夏。");
      cue("unlock");
    } else if (!candidate) {
      setIdentityFeedback("先选择一名候选人，再提交声纹比对。");
      cue("error");
    } else {
      setIdentityFeedback("声纹的停顿与最后通话不吻合。匿名人说的是‘陈牧把我拉上来’，这不是旁观者口吻。");
      cue("error");
    }
  };

  const finish = (id: EndingId) => {
    if (!availability[id]) return;
    cue(id === "trade" ? "error" : "unlock");
    chooseEnding(id);
  };

  return (
    <WindowFrame id="finale" title="最终档案 / 决策节点" index="FINAL" className="max-window finale-window">
      <div className="finale-layout">
        <article className="final-dossier"><header><span>重建卷宗</span><strong>P-07-0712 / FINAL</strong></header><p className="eyebrow">AUTHOR / 调查员 {code}</p><h2>{finalDoc.title}</h2><blockquote>{finalDoc.excerpt}</blockquote>{finalDoc.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}<aside className="external-reader-log" role="note"><span>SESSION WATCH / ARCHIVE-02</span><strong>检测到外部同步读取</strong><p>这台终端仍标记为离线。第二读取游标的身份与撤销权限均为空。</p></aside><footer><span>系统校时偏移 +11 分钟</span><span>船号 H-1707</span><span>官方天气：伪造</span></footer></article>

        <CaseReflection />
        {(readEvidenceIds.includes("ev-toolbox") || readEvidenceIds.includes("ev-voiceprint")) && <ProvisionalTheory correction compact />}

        <section className="identity-check"><div className="puzzle-heading"><div><p className="eyebrow">VOICEPRINT / UNREGISTERED</p><h3>匿名委托人是谁？</h3></div><Radio size={20} /></div>
          <div className="voice-strip"><span>潮汐_0 / 00:31</span><p>“陈牧把我从检修梯拉上来时，我以为所有证据都沉了。别再把我叫作失踪者。”</p></div>
          {anonymous ? <div className="identity-solved"><Check size={17} /><span><strong>身份确认：林知夏</strong>声纹证据 E-19 已进入关系图。</span></div> : <><div className="candidate-list">{candidates.map((item) => <button type="button" key={item.id} className={candidate === item.id ? "is-selected" : ""} onClick={() => setCandidate(item.id)}><strong>{item.label}</strong><small>{item.note}</small></button>)}</div><button type="button" className="secondary-action" onClick={verifyIdentity}><Eye size={15} /> 提交声纹比对</button></>}
          {identityFeedback && <p className="puzzle-feedback" role="status">{identityFeedback}</p>}
        </section>

        {anonymous && <HiddenPuzzle />}

        <section className="ending-decisions"><div className="decision-heading"><p className="eyebrow">FINAL DECISION</p><h3>决定档案的去向</h3><span>已复核关键证据：{availability.critical} / 公布需 8 / 隐藏档案需 10</span></div>
          <div className="ending-options">
            <button type="button" data-ending-id="truth" disabled={!availability.truth} onClick={() => finish("truth")}><Send size={19} /><span><strong>{endings.truth.label}</strong><small>{availability.truth ? "向公众镜像全部档案，触发重新调查。" : "仍需在证据墙复核更多关键证据。"}</small></span></button>
            <button type="button" data-ending-id="trade" disabled={!availability.trade} onClick={() => finish("trade")}><Trash2 size={19} /><span><strong>{endings.trade.label}</strong><small>有限公开污染与作伪证据，同时隐藏林知夏的生还路径。</small></span></button>
            <button type="button" data-ending-id="seventh" disabled={!availability.seventh} onClick={() => finish("seventh")}><Archive size={19} /><span><strong>{endings.seventh.label}</strong><small>{availability.seventh ? "使用七港镜像图追踪其余六个节点。" : "需识破委托人、复核 10 项关键证据并完成镜像口令。"}</small></span></button>
          </div>
          {!availability.truth && <p className="decision-warning"><FileWarning size={15} /> 接受交易始终可选；更强的结局依赖你真正读过的关键证据，而不只是一枚最后按钮。</p>}
        </section>
      </div>
    </WindowFrame>
  );
}
