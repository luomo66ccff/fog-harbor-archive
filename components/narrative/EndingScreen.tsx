"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArchiveRestore, Fingerprint, RotateCcw } from "lucide-react";
import { endings } from "@/lib/case-data";
import { useCaseStore } from "@/store/case-store";

export function EndingScreen({ onRestart }: { onRestart: () => void }) {
  const endingId = useCaseStore((state) => state.currentEnding);
  const code = useCaseStore((state) => state.investigatorCode);
  const completedRuns = useCaseStore((state) => state.completedRuns);
  const runStartedAt = useCaseStore((state) => state.runStartedAt);
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const theoryHistory = useCaseStore((state) => state.theoryHistory);
  const restartCase = useCaseStore((state) => state.restartCase);
  const reduceMotion = useReducedMotion();
  if (!endingId) return null;
  const ending = endings[endingId];
  return (
    <main className={`ending-screen ending-${endingId}`}>
      <div className="ending-fog" aria-hidden="true" />
      <motion.article className="ending-sheet" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="ending-kicker">{ending.kicker}</p><h1>{ending.title}</h1>
        <div className="ending-copy">{ending.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}</div>
        {endingId === "seventh" && (
          <section className="investigator-index" data-easter-egg="investigator-index" aria-labelledby="investigator-index-title">
            <header><Fingerprint size={18} aria-hidden="true" /><div><span>ARCHIVE SUBJECT / AUTO-GENERATED</span><h2 id="investigator-index-title">调查员档案已创建</h2></div></header>
            <dl>
              <div><dt>调查员代号</dt><dd>{code}</dd></div>
              <div><dt>本轮进入时间</dt><dd>{new Date(runStartedAt).toLocaleString("zh-CN", { hour12: false })}</dd></div>
              <div><dt>已发现彩蛋</dt><dd>{discoveredEasterEggs.length} / 8</dd></div>
              <div><dt>临时推理记录</dt><dd>{theoryHistory.some((entry) => entry.includes("->")) ? "曾被新证据修正" : theoryHistory.length ? "已记录，未修正" : "未作判断"}</dd></div>
              <div><dt>最终选择</dt><dd>SEVENTH / 继续追踪</dd></div>
            </dl>
            <p>索引只读取本地游戏状态，不包含真实身份、IP 或设备信息。</p>
          </section>
        )}
        <div className="ending-signature"><span>CASE {completedRuns.toString().padStart(2, "0")} CLOSED</span><strong>调查员 / {code}</strong></div>
        <button type="button" className="primary-action" onClick={() => { restartCase(); onRestart(); }}><RotateCcw size={16} aria-hidden="true" /> 再次调查</button>
        <p className="second-run-hint"><ArchiveRestore size={14} aria-hidden="true" /> 再次调查时，某份摘要会出现一行原本不存在的批注。</p>
      </motion.article>
    </main>
  );
}
