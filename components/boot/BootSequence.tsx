"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw, SkipForward } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CASE_NUMBER } from "@/lib/case-data";
import { useCaseStore } from "@/store/case-store";

type BootPhase = "dormant" | "booting" | "login" | "resume";

const systemLogs = [
  "档案系统连接中 ……",
  "海港管理局备份节点：离线",
  "检测到未登记访问权限",
  "气象缓存校验：存在冲突",
  `正在恢复案件编号：${CASE_NUMBER}`,
  "警告：系统时间与岸钟偏移",
  "恢复完成。等待调查员认证。",
];

export function BootSequence({ onEnter }: { onEnter: () => void }) {
  const code = useCaseStore((state) => state.investigatorCode);
  const bootSeen = useCaseStore((state) => state.bootSeen);
  const runCount = useCaseStore((state) => state.runCount);
  const setInvestigatorCode = useCaseStore((state) => state.setInvestigatorCode);
  const markBootSeen = useCaseStore((state) => state.markBootSeen);
  const restartCase = useCaseStore((state) => state.restartCase);
  const { initializeAudio, cue } = useFogAudio();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<BootPhase>(code && bootSeen ? "resume" : "dormant");
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [input, setInput] = useState(code);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (phase !== "booting") return;
    if (visibleLogs >= systemLogs.length) {
      timer.current = setTimeout(() => setPhase("login"), reduceMotion ? 60 : 520);
      return;
    }
    timer.current = setTimeout(() => {
      setVisibleLogs((value) => value + 1);
      cue("terminal");
    }, reduceMotion ? 45 : 430 + visibleLogs * 70);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cue, phase, reduceMotion, visibleLogs]);

  const resumeStats = useMemo(() => `${CASE_NUMBER} / 第 ${runCount} 次接入`, [runCount]);

  const startBoot = async () => {
    await initializeAudio();
    cue("terminal");
    markBootSeen();
    setVisibleLogs(0);
    setPhase("booting");
  };
  const skipBoot = async () => {
    if (timer.current) clearTimeout(timer.current);
    await initializeAudio();
    markBootSeen();
    setPhase(code ? "resume" : "login");
  };
  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    const nextCode = input.trim();
    if (!nextCode) {
      setError("代号不能为空。匿名系统也得知道该把档案交给谁。");
      cue("error");
      return;
    }
    setInvestigatorCode(nextCode);
    markBootSeen();
    cue("unlock");
    onEnter();
  };
  const restart = () => {
    restartCase();
    cue("paper");
    onEnter();
  };

  return (
    <main className="boot-screen">
      <div className="boot-noise" aria-hidden="true" />
      <div className="boot-vignette" aria-hidden="true" />
      <button className="boot-skip" type="button" onClick={skipBoot}><SkipForward size={14} aria-hidden="true" /> 跳过开场</button>

      <AnimatePresence mode="wait">
        {phase === "dormant" && (
          <motion.section key="dormant" className="restore-terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="soft-cursor" aria-hidden="true" />
            <button type="button" className="restore-button" onClick={startBoot}>
              <span>点击恢复终端</span><small>ARCHIVE NODE / PIER 07</small>
            </button>
          </motion.section>
        )}

        {phase === "booting" && (
          <motion.section key="booting" className="terminal-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite">
            <header><span>雾港港务局 / 只读恢复终端</span><span className="terminal-status">BACKUP 07</span></header>
            <div className="terminal-log">
              {systemLogs.slice(0, visibleLogs).map((log, index) => (
                <motion.p key={log} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}><span>{String(index + 1).padStart(2, "0")}</span> {log}</motion.p>
              ))}
              <span className="terminal-caret" aria-hidden="true">▌</span>
            </div>
          </motion.section>
        )}

        {phase === "login" && (
          <motion.section key="login" className="login-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="eyebrow">UNREGISTERED ACCESS / {CASE_NUMBER}</p>
            <h1>雾港档案</h1><p className="boot-subtitle">失踪的第七码头</p><div className="archive-rule" />
            <p className="login-brief">匿名委托已进入离线收件箱。输入任意调查员代号继续；代号会写入本次卷宗与最终结案记录。</p>
            <form onSubmit={submitCode} noValidate>
              <label htmlFor="investigator-code">调查员代号</label>
              <div className="login-input-row"><span aria-hidden="true">ID/</span><input id="investigator-code" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} autoComplete="off" autoFocus maxLength={18} placeholder="例如：潮痕_07" /></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="primary-action">认证并进入档案 <ArrowRight size={16} aria-hidden="true" /></button>
            </form>
          </motion.section>
        )}

        {phase === "resume" && (
          <motion.section key="resume" className="resume-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="resume-stamp">存档可读</div><p className="eyebrow">调查员 {code}</p><h1>终端仍停在那一夜</h1><p>{resumeStats}</p>
            <div className="resume-actions">
              <button type="button" className="primary-action" onClick={async () => { await initializeAudio(); cue("unlock"); onEnter(); }}>继续调查 <ArrowRight size={16} aria-hidden="true" /></button>
              <button type="button" className="secondary-action" onClick={restart}><RotateCcw size={15} aria-hidden="true" /> 重新开始本案</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <footer className="boot-footer"><span>潮位 3.8m</span><span>本地时间 02:17</span><span>声音仅在交互后启用</span></footer>
    </main>
  );
}

