"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Pause, Play, Radio, Search } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import { FREQUENCY_ANSWER } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";

const waveform = [18, 34, 22, 61, 45, 29, 72, 38, 84, 48, 26, 58, 31, 76, 43, 21, 65, 36, 80, 42, 24, 55, 33, 68, 28, 47, 77, 39, 19, 62];

export function FrequencyPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("frequency"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(22);
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState<"raw" | "low" | "high">("raw");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);
  const revealed = filter === "high" && speed === 0.75 && progress >= 68;

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setProgress((value) => value >= 100 ? 0 : Math.min(100, value + 1.4 * speed)), 280);
    return () => window.clearInterval(interval);
  }, [playing, speed]);

  const displayTime = useMemo(() => {
    const seconds = Math.round(progress * 1.58);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [progress]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    recordAttempt("frequency");
    if (!revealed) {
      setFeedback("口令字段仍被噪声标记覆盖。必须先让正确频段、速度和片段同时对齐。");
      cue("error");
      return;
    }
    if (answer.trim() === FREQUENCY_ANSWER) {
      completePuzzle("frequency");
      setFeedback("口令通过。监控室的密封照片包已弹出。");
      cue("unlock");
    } else {
      setFeedback("解码结果与四组脉冲不符。对照数字摩斯表逐组读取，不要把字母 O 当作数字 0。");
      cue("error");
    }
  };

  if (solved) return <section className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>纸带口令已解析</strong><p>高频脉冲解码为 0712，密封照片包与证据 E-08 已解锁。</p></div></section>;

  return (
    <section className="puzzle-panel frequency-puzzle" aria-labelledby="frequency-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 02 / FREQUENCY TAPE</p><h3 id="frequency-title">纸带 A：最后通话</h3></div><Radio size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">调整进度、速度和滤波器。音频可静音完成；波形、脉冲与字幕提供等价视觉线索。</p>
      <div className={`tape-machine filter-${filter}`}>
        <div className="tape-reels" aria-hidden="true"><span className={playing ? "is-spinning" : ""} /><i /><span className={playing ? "is-spinning" : ""} /></div>
        <div className="waveform" aria-label={revealed ? "检测到四组高频摩斯脉冲" : "噪声波形，尚未分离口令"}>{waveform.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <div className="transport-row"><button type="button" className="icon-button" onClick={() => { setPlaying((value) => !value); cue("tape"); }} aria-label={playing ? "暂停纸带" : "播放纸带"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button><input type="range" min="0" max="100" step="1" value={progress} onChange={(event) => setProgress(Number(event.target.value))} aria-label="纸带播放进度" /><output>{displayTime} / 02:38</output></div>
      </div>
      <div className="frequency-controls">
        <label>播放速度<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.50×</option><option value="0.75">0.75×</option><option value="1">1.00×</option><option value="1.25">1.25×</option></select></label>
        <fieldset><legend>频率滤波</legend>{(["raw", "low", "high"] as const).map((mode) => <button type="button" key={mode} onClick={() => setFilter(mode)} className={filter === mode ? "is-active" : ""} aria-pressed={filter === mode}>{mode === "raw" ? "原始" : mode === "low" ? "低通" : "高通"}</button>)}</fieldset>
      </div>
      <div className={`signal-readout ${revealed ? "is-revealed" : ""}`} aria-live="polite">
        <span>VISUAL ASSIST / 高频脉冲</span><strong>{revealed ? "-----　--...　.----　..---" : "░░░░░　░░░░░　░░░░░　░░░░░"}</strong><small>{revealed ? "数字摩斯参考：0 = -----　1 = .----　2 = ..---　7 = --..." : "继续调整：高频数据仍被宽频噪声遮蔽"}</small>
      </div>
      <form className="puzzle-form" onSubmit={submit}><label htmlFor="frequency-answer">输入四位数字口令</label><div className="answer-row"><input id="frequency-answer" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="____" /><button type="submit" className="primary-action">验证纸带</button></div>{feedback && <p className="puzzle-feedback" role="alert">{feedback}</p>}</form>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.frequency.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.frequency[hintIndex]}</p>}
    </section>
  );
}

