"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArchiveRestore, ChevronDown, FileClock, Fingerprint, RadioTower, RotateCcw } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CinematicEventLayer } from "@/components/cinematic/CinematicEventLayer";
import { InvestigationLog } from "@/components/windows/InvestigationLog";
import { endings } from "@/lib/case-data";
import { evidence } from "@/lib/evidence-data";
import { getVerifiedEvidenceIds } from "@/lib/evidence-engine";
import { useCaseStore } from "@/store/case-store";
import type { EndingId } from "@/types/case";

interface EndingAftermath {
  code: string;
  title: string;
  lead: string;
  beats: readonly { time: string; title: string; body: string }[];
}

const endingAftermath: Record<EndingId, EndingAftermath> = {
  truth: {
    code: "AFTERMATH / +12H",
    title: "案件在天亮后重新打开",
    lead: "公开并没有让雾立刻散去。它只是让更多人不得不承认，港口曾经共同维护过一个错误结论。",
    beats: [
      { time: "+00:08", title: "七份公开镜像完成", body: "原始天气、靠泊记录与责任链被分散保存，单一节点无法再次撤回。" },
      { time: "+12:00", title: "重启调查公告发布", body: "周既明进入正式调查程序；其余人的胁迫、协助与隐瞒被拆开审查。" },
      { time: "+18:40", title: "潮汐_0 停止回应", body: "最后一条回执只有四个字：我看到了。发送节点随后离线。" },
    ],
  },
  trade: {
    code: "AFTERMATH / 04:12",
    title: "两份档案在同一秒生成",
    lead: "有限公开保护了林知夏的生还路线，也把一部分能够解释全案的真相继续留在封存层。",
    beats: [
      { time: "04:12:00", title: "档案删除：1", body: "污染、靠泊与作伪证据离开终端，姓名与逃生路径停在最后一道遮盖线之前。" },
      { time: "+00.8", title: "副本创建：1", body: "本地记录显示删除成功，未知节点却保存了同页、同秒的完整镜像。" },
      { time: "05:30", title: "港口恢复晨班", body: "林知夏仍未进入公开索引。潮汐_0 没有道谢，只留下下一次联络的空白位置。" },
    ],
  },
  seventh: {
    code: "AFTERMATH / ARCHIVE-02",
    title: "调查范围越过第七码头",
    lead: "隐藏层没有给出结束语。六个沿岸节点逐一亮起，而本次调查也成为它们共同读取的一页。",
    beats: [
      { time: "03:08", title: "六个节点进入监听", body: "模糊坐标保持只读，潮位曲线却开始以本次会话为零点继续增长。" },
      { time: "03:09", title: "调查员索引写入", body: "索引只记录本地代号、进入时间、操作摘要与选择结果，不读取身份或设备资料。" },
      { time: "NEXT TIDE", title: "新的终端等待回应", body: "ARCHIVE-02 保持在线。第七层以下没有结案按钮，只有下一轮同步窗口。" },
    ],
  },
};

const theoryLabels: Record<string, string> = {
  pursuer: "追捕者",
  rescuer: "救援者",
  unknown: "无法判断",
};

function formatRunDuration(startedAt: number, endedAt: number | null): string {
  if (!endedAt || endedAt <= startedAt) return "不足 1 分钟";
  const seconds = Math.max(0, Math.floor((endedAt - startedAt) / 1_000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes} 分 ${remainder} 秒` : `${remainder} 秒`;
}

export function EndingScreen({ onRestart }: { onRestart: () => void }) {
  const endingId = useCaseStore((state) => state.currentEnding);
  const code = useCaseStore((state) => state.investigatorCode);
  const completedRuns = useCaseStore((state) => state.completedRuns);
  const runStartedAt = useCaseStore((state) => state.runStartedAt);
  const runEndedAt = useCaseStore((state) => state.runEndedAt);
  const runMemory = useCaseStore((state) => state.runMemory);
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const assistedInvestigation = useCaseStore((state) => state.assistedInvestigation);
  const theoryHistory = useCaseStore((state) => state.theoryHistory);
  const unlockedEvidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const verdicts = useCaseStore((state) => state.evidenceVerdicts);
  const relations = useCaseStore((state) => state.evidenceRelations);
  const touchedIds = useCaseStore((state) => state.evidenceReviewTouchedIds);
  const legacyVerifiedIds = useCaseStore((state) => state.legacyVerifiedEvidenceIds);
  const seenNarrativeEvents = useCaseStore((state) => state.seenNarrativeEvents);
  const markNarrativeEventSeen = useCaseStore((state) => state.markNarrativeEventSeen);
  const discoverEasterEgg = useCaseStore((state) => state.discoverEasterEgg);
  const restartCase = useCaseStore((state) => state.restartCase);
  const { cue } = useFogAudio();
  const reduceMotion = useReducedMotion();
  const indexRecorded = useRef(false);
  const verifiedCriticalCount = useMemo(() => {
    const verifiedIds = new Set(getVerifiedEvidenceIds({
      visibleEvidenceIds: unlockedEvidenceIds,
      legacyVerifiedEvidenceIds: legacyVerifiedIds,
      touchedEvidenceIds: touchedIds,
      verdicts,
      relations,
    }));
    return evidence.filter((item) => item.critical && verifiedIds.has(item.id)).length;
  }, [legacyVerifiedIds, relations, touchedIds, unlockedEvidenceIds, verdicts]);
  const initialTheory = theoryHistory[0]?.split("->")[0];
  const theoryCorrected = theoryHistory.some((entry) => entry.includes("->"));
  const runEasterEggCount = Math.max(0, discoveredEasterEggs.length - runMemory.easterEggCountAtRunStart);

  useEffect(() => {
    if (endingId !== "seventh" || indexRecorded.current) return;
    indexRecorded.current = true;
    if (!seenNarrativeEvents.includes("investigator-index-written")) {
      markNarrativeEventSeen("investigator-index-written");
    }
    if (!discoveredEasterEggs.includes("investigator-index")) {
      discoverEasterEgg("investigator-index");
    }
  }, [discoverEasterEgg, discoveredEasterEggs, endingId, markNarrativeEventSeen, seenNarrativeEvents]);

  if (!endingId) return null;
  const ending = endings[endingId];
  const aftermath = endingAftermath[endingId];
  return (
    <main className={`ending-screen ending-${endingId}`}>
      <CinematicEventLayer onEventStart={(event) => cue(event.id === "ending-trade" ? "error" : event.id === "ending-seventh" ? "terminal" : "unlock")} />
      <div className="ending-fog" aria-hidden="true" />
      <motion.article className="ending-sheet" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="ending-kicker">{ending.kicker}</p><h1>{ending.title}</h1>
        <div className="ending-copy">{ending.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}</div>
        <section className={`ending-aftermath ending-aftermath-${endingId}`} aria-labelledby={`ending-aftermath-${endingId}`}>
          <header><RadioTower size={18} aria-hidden="true" /><div><span>{aftermath.code}</span><h2 id={`ending-aftermath-${endingId}`}>{aftermath.title}</h2></div></header>
          <p>{aftermath.lead}</p>
          <ol>{aftermath.beats.map((beat) => <li key={`${endingId}:${beat.time}`}><time>{beat.time}</time><div><strong>{beat.title}</strong><p>{beat.body}</p></div></li>)}</ol>
          {endingId === "truth" && <blockquote className="ending-relay-receipt"><strong>“我看到了。”</strong><span>UNKNOWN / TIDE RELAY</span></blockquote>}
        </section>
        {endingId === "seventh" && (
          <section className="investigator-index" data-easter-egg="investigator-index" aria-labelledby="investigator-index-title">
            <header><Fingerprint size={18} aria-hidden="true" /><div><span>ARCHIVE SUBJECT / AUTO-GENERATED</span><h2 id="investigator-index-title">调查员档案已创建</h2></div></header>
            <dl>
              <div><dt>调查员代号</dt><dd>{code}</dd></div>
              <div><dt>档案对象编号</dt><dd>P-07-0712 / {code}</dd></div>
              <div><dt>SUBJECT STATUS</dt><dd>ACTIVE</dd></div>
              <div><dt>最终选择</dt><dd>SEVENTH / 继续追踪</dd></div>
              <div><dt>下一节点</dt><dd>尚未命名。</dd></div>
            </dl>
            <p>索引只读取本地游戏状态，不包含真实身份、IP 或设备信息。</p>
          </section>
        )}
        <details className="ending-run-review">
          <summary><FileClock size={16} aria-hidden="true" /><span>展开本轮调查回顾</span><ChevronDown size={15} aria-hidden="true" /></summary>
          <dl className="ending-run-review__summary">
            <div><dt>初始临时判断</dt><dd>{initialTheory ? theoryLabels[initialTheory] ?? initialTheory : "未作判断"}</dd></div>
            <div><dt>是否修正</dt><dd>{theoryCorrected ? "是，新证据已写入修正" : "否"}</dd></div>
            <div><dt>核验关键证据</dt><dd>{verifiedCriticalCount} 项</dd></div>
            <div><dt>本轮隐藏发现</dt><dd>{runEasterEggCount} 项</dd></div>
            <div><dt>辅助调查</dt><dd>{assistedInvestigation ? "已使用" : "未使用"}</dd></div>
            <div><dt>本轮时长</dt><dd>{formatRunDuration(runStartedAt, runEndedAt)}</dd></div>
          </dl>
          <InvestigationLog compact showExport={false} />
        </details>
        <div className="ending-signature"><span>CASE {completedRuns.toString().padStart(2, "0")} CLOSED</span><strong>调查员 / {code}</strong></div>
        <button type="button" className="primary-action" onClick={() => { restartCase(); onRestart(); }}><RotateCcw size={16} aria-hidden="true" /> 再次调查</button>
        <p className="second-run-hint"><ArchiveRestore size={14} aria-hidden="true" /> 再次调查时，某份摘要会出现一行原本不存在的批注。</p>
      </motion.article>
    </main>
  );
}
