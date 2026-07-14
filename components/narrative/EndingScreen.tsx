"use client";

import { motion } from "framer-motion";
import { ArchiveRestore, RotateCcw } from "lucide-react";
import { endings } from "@/lib/case-data";
import { useCaseStore } from "@/store/case-store";

export function EndingScreen({ onRestart }: { onRestart: () => void }) {
  const endingId = useCaseStore((state) => state.currentEnding);
  const code = useCaseStore((state) => state.investigatorCode);
  const completedRuns = useCaseStore((state) => state.completedRuns);
  const restartCase = useCaseStore((state) => state.restartCase);
  if (!endingId) return null;
  const ending = endings[endingId];
  return (
    <main className={`ending-screen ending-${endingId}`}>
      <div className="ending-fog" aria-hidden="true" />
      <motion.article className="ending-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="ending-kicker">{ending.kicker}</p><h1>{ending.title}</h1>
        <div className="ending-copy">{ending.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}</div>
        <div className="ending-signature"><span>CASE {completedRuns.toString().padStart(2, "0")} CLOSED</span><strong>调查员 / {code}</strong></div>
        <button type="button" className="primary-action" onClick={() => { restartCase(); onRestart(); }}><RotateCcw size={16} aria-hidden="true" /> 再次调查</button>
        <p className="second-run-hint"><ArchiveRestore size={14} aria-hidden="true" /> 再次调查时，某份摘要会出现一行原本不存在的批注。</p>
      </motion.article>
    </main>
  );
}

