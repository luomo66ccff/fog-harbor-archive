"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Eye, Gauge, Pause, Play, Radio, ScanLine, Search } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import {
  FREQUENCY_ANSWER,
  canLockFrequencySignal,
  isFrequencySetupCorrect,
  isFrequencySignalWindow,
} from "@/lib/puzzle-engine";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import type { FrequencyFilter } from "@/types/puzzle";

const waveform = [18, 34, 22, 61, 45, 29, 72, 38, 84, 48, 26, 58, 31, 76, 43, 21, 65, 36, 80, 42, 24, 55, 33, 68, 28, 47, 77, 39, 19, 62];

export function FrequencyPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("frequency"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const markTaskProgress = useCaseStore((state) => state.markTaskProgress);
  const { cue } = useFogAudio();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(22);
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState<FrequencyFilter>("raw");
  const [playedSignalWindow, setPlayedSignalWindow] = useState(false);
  const [signalLocked, setSignalLocked] = useState(false);
  const [visualAssist, setVisualAssist] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);
  const progressRef = useRef(22);

  const signalState = useMemo(() => ({ speed, filter, progress, playedSignalWindow }), [filter, playedSignalWindow, progress, speed]);
  const setupCorrect = isFrequencySetupCorrect(signalState);
  const insideSignalWindow = isFrequencySignalWindow(progress);
  const lockable = canLockFrequencySignal(signalState);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      const value = progressRef.current;
      const next = value >= 100 ? 0 : Math.min(100, value + 1.4 * speed);
      progressRef.current = next;
      setProgress(next);
      if (setupCorrect && isFrequencySignalWindow(next)) setPlayedSignalWindow(true);
    }, 280);
    return () => window.clearInterval(interval);
  }, [playing, setupCorrect, speed]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const displayTime = useMemo(() => {
    const seconds = Math.round(progress * 1.58);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [progress]);

  const vuLevel = waveform[Math.min(waveform.length - 1, Math.floor((progress / 100) * waveform.length))] ?? 18;
  const machineStyle = {
    "--tape-recorder-image": `url("${visualAssets.tapeRecorder}")`,
    "--reel-duration": `${Math.max(0.6, 1.8 / speed)}s`,
    "--vu-level": `${vuLevel}%`,
    "--vu-angle": `${-36 + vuLevel * 0.72}deg`,
  } as CSSProperties;

  const lockSignal = () => {
    if (!setupCorrect) {
      setFeedback("锁相失败：当前速度与频段无法分离窄脉冲。先降低播放速度，并排除低频底噪。");
      cue("error");
      return;
    }
    if (!playedSignalWindow) {
      setFeedback("参数已经接近，但播放头尚未实际经过关键区间。请播放纸带，不要只拖动进度条。");
      cue("error");
      return;
    }
    if (!insideSignalWindow) {
      setFeedback("检测到过短暂脉冲，但播放头已经离开。回到高频波峰区域再执行锁定。");
      cue("error");
      return;
    }
    if (!lockable) return;
    setPlaying(false);
    setSignalLocked(true);
    markTaskProgress("repair-call", "signal-locked");
    setFeedback("信号已锁定：捕获到四组数字脉冲。可按需开启视觉译码辅助。");
    cue("paper");
  };

  const togglePlayback = () => {
    const next = !playing;
    setPlaying(next);
    if (next && setupCorrect && insideSignalWindow) setPlayedSignalWindow(true);
    cue("tape");
  };

  const scrubTo = (value: number) => {
    progressRef.current = value;
    setProgress(value);
  };

  const selectSpeed = (value: number) => {
    setSpeed(value);
    if (isFrequencySetupCorrect({ speed: value, filter })) markTaskProgress("repair-call", "filter-setup");
    setFeedback("");
  };

  const selectFilter = (value: FrequencyFilter) => {
    setFilter(value);
    if (isFrequencySetupCorrect({ speed, filter: value })) markTaskProgress("repair-call", "filter-setup");
    setFeedback("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    recordAttempt("frequency");
    if (!signalLocked) {
      setFeedback("口令通道尚未锁定。正确参数、真实播放与手动锁定三项缺一不可。");
      cue("error");
      return;
    }
    if (answer.trim() === FREQUENCY_ANSWER) {
      completePuzzle("frequency");
      setFeedback("口令通过。监控室的密封照片包已弹出。");
      cue("unlock");
    } else {
      setFeedback("解码结果与四组脉冲不符。逐组对照数字摩斯，不要把字母 O 当作数字 0。");
      cue("error");
    }
  };

  if (solved) return <section className="frequency-solved"><div className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>纸带口令已解析</strong><p>高频脉冲解码为 0712，密封照片包与证据 E-08 已解锁。</p></div></div><div className="frequency-lock-echo" aria-label="信号锁定，VU 表稳定，播放头已停止"><span>VU / STABLE</span><i /><i /><i /><i /><b /></div></section>;

  return (
    <section className="puzzle-panel frequency-puzzle frequency-puzzle--upgraded" aria-labelledby="frequency-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 02 / SIGNAL LOCK</p><h3 id="frequency-title">纸带 A：最后通话</h3></div><Radio size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">调整速度与滤波，实际播放到高频脉冲区，再手动锁定信号。静音不会影响波形、节奏闪烁或译码辅助。</p>

      <div className={`recorder-console filter-${filter} ${playing ? "is-playing" : ""} ${signalLocked ? "is-locked" : ""}`} style={machineStyle}>
        <div className="recorder-console__image" aria-hidden="true" />
        <div className="recorder-console__status">
          <span className={signalLocked ? "is-on" : ""}>{signalLocked ? "SIGNAL LOCKED" : "SEARCHING SIGNAL"}</span>
          <strong>{displayTime} / 02:38</strong>
        </div>

        <div className="recorder-console__reels" aria-hidden="true"><span /><span /></div>
        <div className="recorder-console__vu" aria-label={`信号强度 ${vuLevel}%`}><i /><i /></div>

        <div className="recorder-waveform" aria-label={insideSignalWindow && setupCorrect ? "高频脉冲区正在经过播放头" : "宽频噪声波形"}>
          <span className="recorder-waveform__signal-zone" aria-hidden="true" />
          {waveform.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
          <b style={{ left: `${progress}%` }} aria-hidden="true" />
        </div>

        <div className="recorder-transport">
          <button type="button" className="icon-button" onClick={togglePlayback} aria-label={playing ? "暂停纸带" : "播放纸带"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <input type="range" min="0" max="100" step="1" value={progress} onChange={(event) => scrubTo(Number(event.target.value))} aria-label="纸带播放头位置" />
          <button type="button" className={`signal-lock-button ${lockable ? "is-ready" : ""}`} onClick={lockSignal}><ScanLine size={16} /> {signalLocked ? "信号已锁定" : "锁定信号"}</button>
        </div>

        <div className="recorder-controls">
          <label className="recorder-knob"><span>播放速度</span><select value={speed} onChange={(event) => selectSpeed(Number(event.target.value))} aria-label="播放速度旋钮"><option value="0.5">0.50×</option><option value="0.75">0.75×</option><option value="1">1.00×</option><option value="1.25">1.25×</option></select></label>
          <fieldset><legend>频率滤波旋钮</legend>{(["raw", "low", "high"] as const).map((mode) => <button type="button" key={mode} onClick={() => selectFilter(mode)} className={filter === mode ? "is-active" : ""} aria-pressed={filter === mode}>{mode === "raw" ? "原始" : mode === "low" ? "低通" : "高通"}</button>)}</fieldset>
          <div className="recorder-meter-copy"><Gauge size={15} /><span>{setupCorrect ? "窄带监听" : "宽频监听"}</span><strong>{playedSignalWindow ? "脉冲已捕获" : "等待播放"}</strong></div>
        </div>
      </div>

      <div className={`signal-readout signal-readout--upgraded ${signalLocked ? "is-revealed" : ""}`} aria-live="polite">
        <span>VISUAL ASSIST / 高频脉冲</span>
        {!signalLocked && <><strong>{setupCorrect && insideSignalWindow ? "▮ · ▮ · ·　▮ ▮ ·　· ▮ ·" : "░░░░░　░░░░░　░░░░░　░░░░░"}</strong><small>{setupCorrect ? "让播放头经过脉冲区并手动锁定" : "高频数据仍被宽频噪声遮蔽"}</small></>}
        {signalLocked && !visualAssist && <button type="button" className="visual-assist-button" onClick={() => setVisualAssist(true)}><Eye size={15} /> 开启视觉译码</button>}
        {signalLocked && visualAssist && <><strong>-----　--...　.----　..---</strong><small>数字摩斯参考：0 = -----　1 = .----　2 = ..---　7 = --...</small></>}
      </div>

      <form className="puzzle-form" onSubmit={submit}><label htmlFor="frequency-answer">输入四位数字口令</label><div className="answer-row"><input id="frequency-answer" inputMode="numeric" value={answer} disabled={!signalLocked} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="____" /><button type="submit" className="primary-action">验证纸带</button></div>{feedback && <p className="puzzle-feedback" role="alert">{feedback}</p>}</form>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.frequency.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.frequency[hintIndex]}</p>}
    </section>
  );
}
