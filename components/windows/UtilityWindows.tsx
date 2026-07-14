"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CassetteTape, Check, Contrast, Eraser, FileAudio, Pause, Play, RotateCcw, Save, ScanLine, SunMedium, Volume2, VolumeX } from "lucide-react";
import { FrequencyPuzzle } from "@/components/puzzles/FrequencyPuzzle";
import { PhotoPuzzle } from "@/components/puzzles/PhotoPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { audioRecords } from "@/lib/case-data";
import { isGhostChannelTuned } from "@/lib/easter-egg-engine";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";

export function AudioWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const intent = useWindowStore((state) => state.pendingIntents.audio);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const available = useMemo(() => audioRecords.filter((record) => !record.unlockAfter || completed.includes(record.unlockAfter)), [completed]);
  const [initialIntent] = useState(() => useWindowStore.getState().pendingIntents.audio);
  const [tab, setTab] = useState<"analyze" | "transcripts">(initialIntent?.tab === "transcripts" || initialIntent?.focusId ? "transcripts" : "analyze");
  const [selectedId, setSelectedId] = useState(() => available.some((record) => record.id === initialIntent?.focusId) ? initialIntent!.focusId! : "audio-call");
  const selected = available.find((record) => record.id === selectedId) ?? available[0];
  useEffect(() => {
    if (!intent) return;
    const frame = window.requestAnimationFrame(() => {
      if (intent.tab === "analyze" || intent.tab === "transcripts") setTab(intent.tab);
      if (intent.focusId && available.some((record) => record.id === intent.focusId)) {
        setSelectedId(intent.focusId);
        setTab("transcripts");
      }
      consumeIntent("audio", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [available, consumeIntent, intent]);
  return (
    <WindowFrame id="audio" title="录音带修复台" index="R-03" className="wide-window">
      <div className="window-tabs"><button type="button" className={tab === "analyze" ? "is-active" : ""} onClick={() => setTab("analyze")}><CassetteTape size={14} /> 频率分析 {completed.includes("frequency") && <Check size={13} />}</button><button type="button" className={tab === "transcripts" ? "is-active" : ""} onClick={() => setTab("transcripts")}><FileAudio size={14} /> 视觉辅助文本 ({available.length})</button></div>
      {tab === "analyze" ? <div className="audio-machine-shell"><div className="audio-machine-header"><span>MGPA / 纸带修复工作台</span><strong>纸带 A · 2019.07.12</strong><small>图像仅为机柜材质；参数、波形与口令以下方交互控制台为准</small></div><div className="audio-machine-interaction"><FrequencyPuzzle /></div></div> : <div className="audio-archive"><aside>{available.map((record) => <button type="button" key={record.id} className={selected?.id === record.id ? "is-selected" : ""} onClick={() => setSelectedId(record.id)}><span>{record.duration}</span><strong>{record.title}</strong><small>{record.source}</small></button>)}</aside>{selected && <article><p className="eyebrow">ACCESSIBLE TRANSCRIPT</p><h2>{selected.title}</h2><p>来源：{selected.source}　/　长度：{selected.duration}</p><div className="transcript-lines">{selected.transcript.map((line) => <p key={line}>{line}</p>)}</div><footer>音频不可用或关闭时，本转写提供完整的等价解谜信息。</footer></article>}</div>}
    </WindowFrame>
  );
}

export function SurveillanceWindow() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("photo"));
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const discoverEasterEgg = useCaseStore((state) => state.discoverEasterEgg);
  const [channel, setChannel] = useState("C-07");
  const [brightness, setBrightness] = useState(94);
  const [contrast, setContrast] = useState(108);
  const [frozen, setFrozen] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const ghostVisible = isGhostChannelTuned({ frozen, brightness, contrast });

  useEffect(() => {
    if (ghostVisible) discoverEasterEgg("ghost-channel");
  }, [discoverEasterEgg, ghostVisible]);

  const openWorkbench = () => {
    setChannel("C-07");
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      workbenchRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      workbenchRef.current?.querySelector<HTMLElement>("button, input, select")?.focus({ preventScroll: true });
    });
  };

  const roomImageStyle: CSSProperties = {
    backgroundImage: `url(${visualAssets.surveillanceRoom})`,
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
  };
  const sideChannels = [
    { id: "C-02", label: "北闸", style: { left: "3.2%", top: "7%", width: "18.5%", height: "24%" } },
    { id: "C-03", label: "仓栈", style: { left: "3.2%", top: "35%", width: "18.5%", height: "23%" } },
    { id: "C-04", label: "下层", style: { left: "3.2%", top: "62%", width: "18.5%", height: "22%" } },
    { id: "C-08", label: "外闸", style: { right: "3.2%", top: "7%", width: "18.5%", height: "24%" } },
    { id: "C-09", label: "水线", style: { right: "3.2%", top: "35%", width: "18.5%", height: "23%" } },
    { id: "C-12", label: "检修梯", style: { right: "3.2%", top: "62%", width: "18.5%", height: "22%" } },
  ];
  return (
    <WindowFrame id="surveillance" title="监控室 / CCTV-7" index="C-07" className="wide-window">
      <div className="cctv-status"><span className="record-dot" /> 2019.07.12 / CHANNEL {(ghostVisible ? "C-00" : channel).replace("C-", "")} / 档案帧 / 系统偏移 +11 分钟</div>
      <section className={`surveillance-room-shell ${frozen ? "is-frozen" : ""}`} aria-label="监控室频道选择与画面校准">
        <div className="surveillance-room-image" style={roomImageStyle} aria-hidden="true" />
        {sideChannels.map((item) => <button type="button" key={item.id} className={`surveillance-screen-hotspot ${channel === item.id ? "is-selected" : ""}`} style={item.style} onClick={() => setChannel(item.id)} aria-pressed={channel === item.id}><span>{item.id}</span><strong>{item.label}</strong><small>{item.id === "C-12" && solved ? "已恢复" : "只读帧"}</small></button>)}
        <button type="button" className={`surveillance-primary-screen ${channel === "C-07" ? "is-selected" : ""}`} onClick={openWorkbench} aria-label="打开七号码头密封照片工作台"><span>中央 CRT / C-07</span><strong>第七码头密封照片</strong><small>2019.07.12　00:42 系统叠字</small><em><ScanLine size={15} /> 打开扫描工作台</em></button>
        {ghostVisible && <div className="ghost-channel-frame" data-easter-egg="ghost-channel" role="status"><span>C-00 / LIVE MIRROR</span><strong>空的调查室</strong><p>画面里的桌面布局与当前终端完全一致。椅子前没有人。</p></div>}
        <div className="surveillance-date-mask" aria-label="剧情录像时间"><span>MGPA ARCHIVE</span><strong>2019.07.12 / 00:42</strong></div>
      </section>
      <div className="surveillance-controls">
        <label><span><SunMedium size={15} /> 亮度 <output>{brightness}%</output></span><input type="range" min="38" max="118" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
        <label><span><Contrast size={15} /> 对比度 <output>{contrast}%</output></span><input type="range" min="58" max="132" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label>
        <button type="button" className={frozen ? "is-active" : ""} onClick={() => setFrozen((value) => !value)} aria-pressed={frozen}>{frozen ? <Play size={15} /> : <Pause size={15} />}{frozen ? "恢复画面" : "冻结帧"}</button>
      </div>
      <div className="surveillance-workbench" ref={workbenchRef} tabIndex={-1}><header><span>损坏扫描仪 / PHOTO PACKET 07</span><strong>交互数据与验证结果以下方工作台为准</strong></header><PhotoPuzzle /></div>
      {discoveredEasterEggs.includes("ghost-channel") && !ghostVisible && <p className="ghost-channel-record">隐藏频道 C-00 已记录：冻结画面并降低亮度、对比度可再次查看。</p>}
      {solved && <div className="frame-comparison"><article><span>系统叠字</span><strong>00:42</strong><p>来自被校准后的录像时间。</p></article><i aria-hidden="true">≠</i><article><span>岸钟倒影</span><strong>00:31</strong><p>机械岸钟不受系统校时影响。</p></article></div>}
    </WindowFrame>
  );
}

export function NotesWindow() {
  const note = useCaseStore((state) => state.caseNote);
  const setNote = useCaseStore((state) => state.setCaseNote);
  return (
    <WindowFrame id="notes" title="调查笔记" index="NOTE" className="small-window">
      <div className="notebook-page"><header><span>调查员私人记录</span><strong><Save size={14} /> 自动存档</strong></header><label htmlFor="case-note">自由记录人物、时间与疑点</label><textarea id="case-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：官方时间似乎都比物理记录快……" /><footer><span>{note.length} 字符</span><em>内容仅保存在此设备</em></footer></div>
    </WindowFrame>
  );
}

export function SettingsWindow({ onLeave }: { onLeave: () => void }) {
  const audio = useCaseStore((state) => state.audio);
  const degraded = useCaseStore((state) => state.soundDegraded);
  const updateAudio = useCaseStore((state) => state.updateAudio);
  const assistedInvestigation = useCaseStore((state) => state.assistedInvestigation);
  const setAssistedInvestigation = useCaseStore((state) => state.setAssistedInvestigation);
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const restartCase = useCaseStore((state) => state.restartCase);
  const clearAllProgress = useCaseStore((state) => state.clearAllProgress);
  const closeAll = useWindowStore((state) => state.closeAll);

  const restart = () => {
    if (!window.confirm("重新开始本案？当前谜题、已读状态与笔记会清空，但周目和结局记录会保留。")) return;
    restartCase(); closeAll(); onLeave();
  };
  const clear = () => {
    if (!window.confirm("清除全部本地进度？此操作会删除代号、谜题、笔记和结局记录。")) return;
    clearAllProgress(); closeAll(); onLeave();
  };

  return (
    <WindowFrame id="settings" title="系统设置" index="SYS" className="small-window">
      <section className="settings-panel"><header>{audio.muted ? <VolumeX size={22} /> : <Volume2 size={22} />}<div><p className="eyebrow">LOCAL AUDIO BUS</p><h2>声音与存档</h2></div></header>
        {degraded && <p className="degraded-notice"><AlertTriangle size={15} /> 浏览器音频不可用，已启用完整视觉辅助；解谜不会受影响。</p>}
        <label className="switch-row"><span><strong>总声音</strong><small>环境声与界面提示音</small></span><input type="checkbox" checked={!audio.muted} onChange={(event) => updateAudio({ muted: !event.target.checked })} /></label>
        <label className="range-row"><span>总音量 <output>{Math.round(audio.volume * 100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(event) => updateAudio({ volume: Number(event.target.value) })} /></label>
        <label className="switch-row"><span><strong>环境声</strong><small>雨声、远处汽笛与低频氛围</small></span><input type="checkbox" checked={audio.ambient} onChange={(event) => updateAudio({ ambient: event.target.checked })} /></label>
        <label className="switch-row"><span><strong>界面音效</strong><small>纸张、按键、纸带与解锁提示</small></span><input type="checkbox" checked={audio.interface} onChange={(event) => updateAudio({ interface: event.target.checked })} /></label>
        <label className="switch-row assisted-investigation-setting"><span><strong>辅助调查模式</strong><small>逐区扫描会自动确认照片异常，责任链从一开始显示 Token 分类；不改变剧情、证据或结局条件。</small></span><input type="checkbox" checked={assistedInvestigation} onChange={(event) => setAssistedInvestigation(event.target.checked)} /></label>
        <p className="easter-egg-counter">隐藏发现记录：{discoveredEasterEggs.length} / 8　·　所有隐藏互动均为可选，不参与主线或结局判定。</p>
        <div className="save-actions"><button type="button" onClick={restart}><RotateCcw size={15} /> 重新开始本案</button><button type="button" className="danger-action" onClick={clear}><Eraser size={15} /> 清除全部进度</button></div>
        <p className="settings-footnote">调查进度在每次操作后自动写入 localStorage。声音关闭不影响任何谜题答案。</p>
      </section>
    </WindowFrame>
  );
}
