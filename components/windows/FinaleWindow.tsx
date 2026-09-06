"use client";

import { useEffect, useState } from "react";
import { Archive, Check, Eye, Radio, Send, Shield, Scale } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CaseReflection } from "@/components/narrative/CaseReflection";
import { ProvisionalTheory } from "@/components/narrative/ProvisionalTheory";
import { HiddenPuzzle } from "@/components/puzzles/HiddenPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { endings } from "@/lib/case-data";
import { getEndingAvailability } from "@/lib/ending-engine";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";
import type { EndingId } from "@/types/case";

const candidates = [
  { id: "tang-zhi", label: "唐芷", note: "最后通话的接听者" },
  { id: "lin-zhixia", label: "林知夏", note: "法定状态仍为失踪" },
  { id: "xu-wancheng", label: "许晚澄", note: "保留了原始天气缓存" },
];

export function FinaleWindow() {
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const claimSubmissions = useCaseStore((state) => state.claimSubmissions);
  const anonymous = useCaseStore((state) => state.discoveredAnonymous);
  const code = useCaseStore((state) => state.investigatorCode);
  const identifyAnonymous = useCaseStore((state) => state.identifyAnonymous);
  const chooseEnding = useCaseStore((state) => state.chooseEnding);
  const markEvidenceRead = useCaseStore((state) => state.markEvidenceRead);
  const markDocumentRead = useCaseStore((state) => state.markDocumentRead);
  const markNarrativeEventSeen = useCaseStore((state) => state.markNarrativeEventSeen);
  const openWindow = useWindowStore((state) => state.openWindow);
  const { cue } = useFogAudio();
  const [candidate, setCandidate] = useState("");
  const [identityFeedback, setIdentityFeedback] = useState("");

  useEffect(() => {
    markDocumentRead("doc-final");
    markEvidenceRead("ev-final-chain");
    markNarrativeEventSeen("external-reader-detected");
  }, [markDocumentRead, markEvidenceRead, markNarrativeEventSeen]);

  const availability = getEndingAvailability({ completedPuzzles, unlockedEvidenceIds, readEvidenceIds, claimSubmissions, discoveredAnonymous: anonymous });
  const proven = availability.proven;
  const verifyIdentity = () => {
    if (candidate === "lin-zhixia") {
      identifyAnonymous();
      markEvidenceRead("ev-voiceprint");
      setIdentityFeedback("声纹、呼吸间隔与检修艇接应记录吻合：潮汐_0 是活下来的林知夏。");
      cue("unlock");
    } else {
      setIdentityFeedback(candidate ? "这份声纹与最后通话中的说话者不吻合。接听者、报警设备持有人与被接走者是不同角色。" : "先选择候选人，再提交声纹比对。");
      cue("error");
    }
  };
  const finish = (id: EndingId) => {
    if (!availability[id]) return;
    cue("unlock");
    chooseEnding(id);
  };

  return <WindowFrame id="finale" title="最终档案 / 决策节点" index="FINAL" className="max-window finale-window">
    <div className="finale-layout">
      <article className="final-dossier"><header><span>对质生成卷宗</span><strong>P-07-0712 / FINAL</strong></header><p className="eyebrow">AUTHOR / 调查员 {code}</p><h2>没有下雨的夜晚</h2><blockquote>每一条事实都保留其来源，每一个未知都留待下一次调查。</blockquote>
        <h3>已确认事实</h3><ul>
          {proven.includes("clock-fabrication") && <li>整夜无雨。周既明在 00:31:06 将主时钟快调十一分钟；独立物理记录与管理员会话相互印证。</li>}
          {proven.includes("heron-coverup") && <li>H-1707 实卸 12.1 吨含汞声呐污泥；靠泊纸本、图像、付款与校时审计共同证明雾港节点的掩盖行为。</li>}
          {proven.includes("ladder-escape") && <li>126 秒巡检空窗、00:42:12 三敲与 M-4 应答组成预先安排的接应；陈牧将人带离港区。照片不能单独证明追捕或坠海。</li>}
          {proven.includes("archive02-continuity") && <li>ARCHIVE-02 沿用 2019 年销毁作业指纹。潮汐_0 来自另一只读通道，两个读取者不能混为一人。</li>}
        </ul>
        <h3>责任分层</h3><p>周既明主导雾港时间作伪。顾惟安参与开闸与擦除记录，付款附件另记载了对其家人的胁迫。许晚澄签署了假天气记录，也留下原始缓存并争取逃生时间。陈牧的隐瞒保护了接应路线，不能由此倒推他是追捕者。</p>
        <p>{anonymous ? "实时声纹确认：匿名委托人潮汐_0 就是林知夏。" : "林知夏的生还链已重建；匿名委托人的当前身份仍需声纹比对。"}</p>
        <div className="dossier-unknown"><h3>仍未证实</h3><p>周的上级、污泥最终倾倒地点、其余六港操作者，以及唐芷失联和陈牧死亡的原因。{proven.includes("archive02-continuity") ? "系统连续性已证实，ARCHIVE-02 当前操作者仍未知。" : "第二读取节点与旧封存系统是否连续，需要第四项对质。"}</p></div>
        <aside className="external-reader-log" role="note"><span>SESSION WATCH / ARCHIVE-02</span><strong>当前页码正被第二节点同步读取。</strong><p>你可以证明它沿用了什么流程；现有记录尚不能告诉你屏幕另一端是谁。</p></aside>
      </article>
      <CaseReflection />
      {(readEvidenceIds.includes("ev-toolbox") || readEvidenceIds.includes("ev-voiceprint")) && <ProvisionalTheory correction compact />}
      <section className="identity-check"><div className="puzzle-heading"><div><p className="eyebrow">VOICEPRINT / UNREGISTERED</p><h3>匿名委托人是谁？</h3></div><Radio size={20} /></div>
        <div className="voice-strip"><span>潮汐_0 / 00:31</span><p>“陈牧把我从检修梯拉上来时，我以为所有证据都沉了。别再把我叫作失踪者。”</p></div>
        {anonymous ? <div className="identity-solved"><Check size={17} /><span><strong>身份确认：林知夏</strong>声纹证据 E-19 已进入关系图。</span></div> : <><div className="candidate-list">{candidates.map((item) => <button type="button" key={item.id} className={candidate === item.id ? "is-selected" : ""} aria-pressed={candidate === item.id} onClick={() => setCandidate(item.id)}><strong>{item.label}</strong><small>{item.note}</small></button>)}</div><button type="button" className="secondary-action" onClick={verifyIdentity}><Eye size={15} /> 提交声纹比对</button></>}
        {identityFeedback && <p className="puzzle-feedback" role="status">{identityFeedback}</p>}
      </section>
      {anonymous && <HiddenPuzzle />}
      <section className="ending-decisions"><div className="decision-heading"><p className="eyebrow">FINAL DECISION</p><h3>决定档案的去向</h3><span>已成立对质 {proven.length} / 4</span></div>
        <div className="ending-options">
          <button type="button" data-ending-id="truth" disabled={!availability.truth} onClick={() => finish("truth")}><Send size={19} /><span><strong>{endings.truth.label}</strong><small>{availability.truth ? "公开主线原始证据与实名责任，包括林的身份和接应路线。触发追责，也暴露消息源。" : "需要三项主线对质成立，并确认匿名委托人的身份。"}</small></span></button>
          <button type="button" data-ending-id="trade" disabled={!availability.trade} onClick={() => finish("trade")}><Shield size={19} /><span><strong>{endings.trade.label}</strong><small>公开污染、靠泊、付款及作伪责任；遮蔽林的声纹、陈的路线和唐的消息源，接受公开材料暂不完整。</small></span></button>
          <button type="button" data-ending-id="seventh" disabled={!availability.seventh} onClick={() => finish("seventh")}><Archive size={19} /><span><strong>{endings.seventh.label}</strong><small>{availability.seventh ? "分散保全四项对质材料，追踪其余六港；保护幸存者，暂缓雾港公开追责。" : "确认身份、解开镜像口令，再完成 ARCHIVE-02 的第四项对质。"}</small></span></button>
        </div>
        <button type="button" className="secondary-action" onClick={() => openWindow("evidence", { tab: "deduction" })}><Scale size={15} /> 返回关键对质</button>
      </section>
    </div>
  </WindowFrame>;
}
