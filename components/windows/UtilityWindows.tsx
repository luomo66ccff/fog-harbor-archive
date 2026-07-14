"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CassetteTape, Check, Eraser, FileAudio, RotateCcw, Save, Volume2, VolumeX } from "lucide-react";
import { FrequencyPuzzle } from "@/components/puzzles/FrequencyPuzzle";
import { PhotoPuzzle } from "@/components/puzzles/PhotoPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { audioRecords } from "@/lib/case-data";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";

export function AudioWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const [tab, setTab] = useState<"analyze" | "transcripts">("analyze");
  const available = useMemo(() => audioRecords.filter((record) => !record.unlockAfter || completed.includes(record.unlockAfter)), [completed]);
  const [selectedId, setSelectedId] = useState("audio-call");
  const selected = available.find((record) => record.id === selectedId) ?? available[0];
  return (
    <WindowFrame id="audio" title="录音带修复台" index="R-03" className="wide-window">
      <div className="window-tabs"><button type="button" className={tab === "analyze" ? "is-active" : ""} onClick={() => setTab("analyze")}><CassetteTape size={14} /> 频率分析 {completed.includes("frequency") && <Check size={13} />}</button><button type="button" className={tab === "transcripts" ? "is-active" : ""} onClick={() => setTab("transcripts")}><FileAudio size={14} /> 视觉辅助文本 ({available.length})</button></div>
      {tab === "analyze" ? <FrequencyPuzzle /> : <div className="audio-archive"><aside>{available.map((record) => <button type="button" key={record.id} className={selected?.id === record.id ? "is-selected" : ""} onClick={() => setSelectedId(record.id)}><span>{record.duration}</span><strong>{record.title}</strong><small>{record.source}</small></button>)}</aside>{selected && <article><p className="eyebrow">ACCESSIBLE TRANSCRIPT</p><h2>{selected.title}</h2><p>来源：{selected.source}　/　长度：{selected.duration}</p><div className="transcript-lines">{selected.transcript.map((line) => <p key={line}>{line}</p>)}</div><footer>音频不可用或关闭时，本转写提供完整的等价解谜信息。</footer></article>}</div>}
    </WindowFrame>
  );
}

export function SurveillanceWindow() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("photo"));
  return (
    <WindowFrame id="surveillance" title="监控室 / CCTV-7" index="C-07" className="wide-window">
      <div className="cctv-status"><span className="record-dot" /> CHANNEL 07 / ARCHIVE FRAME / SYSTEM +11 MIN</div>
      <PhotoPuzzle />
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
        <div className="save-actions"><button type="button" onClick={restart}><RotateCcw size={15} /> 重新开始本案</button><button type="button" className="danger-action" onClick={clear}><Eraser size={15} /> 清除全部进度</button></div>
        <p className="settings-footnote">调查进度在每次操作后自动写入 localStorage。声音关闭不影响任何谜题答案。</p>
      </section>
    </WindowFrame>
  );
}

