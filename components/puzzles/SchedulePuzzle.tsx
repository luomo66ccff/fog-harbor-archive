"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Check, FileClock, Search } from "lucide-react";
import "@/app/puzzle-upgrade.css";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { TimelineAlignment } from "@/components/puzzles/TimelineAlignment";
import { puzzleGuidance } from "@/lib/case-data";
import { evaluateTimelineAlignment, timelineEvents } from "@/lib/puzzle-engine";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";

const records = [
  { id: "duty", source: "值班签到表", time: "00:42", detail: "周既明进入监控室（手写补录）", anchor: "校时事件", texture: visualAssets.documents.duty },
  { id: "port", source: "船只进港记录", time: "00:20 / 01:07", detail: "外闸磁感器原始时间，没有系统校时字段", anchor: "物理传感器", texture: visualAssets.documents.manifest },
  { id: "weather", source: "自动气象站日志", time: "00:31", detail: "岸钟反光校准帧；电子叠字显示 00:42", anchor: "同一帧双时钟", texture: visualAssets.documents.weather },
  { id: "phone", source: "通话录音头", time: "00:39 / 屏显 00:50", detail: "通信节点原始时间与港务终端屏显", anchor: "同一通话双时间", texture: visualAssets.documents.summary },
] as const;
const emptyReviewed: string[] = [];

export function SchedulePuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("schedule"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const markTaskProgress = useCaseStore((state) => state.markTaskProgress);
  const reviewed = useCaseStore((state) => state.taskProgress["restore-time"]) ?? emptyReviewed;
  const { cue } = useFogAudio();
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);
  const ready = reviewed.length === records.length;
  const selected = useMemo(() => new Set(reviewed), [reviewed]);

  const inspect = (id: string) => {
    markTaskProgress("restore-time", id);
    setFeedback("");
    cue("paper");
  };

  const updateOffset = (nextOffset: number, snapped: boolean) => {
    setOffset(nextOffset);
    setFeedback("");
    if (snapped) cue("paper");
  };

  const submit = () => {
    recordAttempt("schedule");
    if (!ready) {
      setFeedback(`还有 ${records.length - reviewed.length} 份来源没有展开。先确认同一事件在不同设备上的原始时间。`);
      cue("error");
      return;
    }
    const result = evaluateTimelineAlignment(offset);
    if (result.complete) {
      completePuzzle("schedule");
      setFeedback("校准通过：两组共同事件同时重合，港务系统主时钟存在稳定偏移。");
      cue("unlock");
      return;
    }
    const labels = timelineEvents.filter((event) => result.misalignedIds.includes(event.id)).map((event) => event.label);
    const direction = result.direction === "forward" ? "物理时间轴还需要向后移动" : "物理时间轴移得过远，尝试向前回调";
    setFeedback(`${labels.join("、")}仍未重合；${direction}。可重新查看气象站日志与通话录音头。`);
    cue("error");
  };

  if (solved) {
    return <section className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>时间链已校准</strong><p>原始岸钟 00:31，对应被修改后的系统时间 00:42。偏移已写入证据 E-07。</p></div></section>;
  }

  return (
    <section className="puzzle-panel schedule-puzzle schedule-puzzle--upgraded" aria-labelledby="schedule-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 01 / DUAL TIMELINE</p><h3 id="schedule-title">被篡改的值班时间表</h3></div><FileClock size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">展开四份原始记录，再拖动物理时间轴，让两组“同一事件、双时间”同时重合。真实时间均由档案数据渲染。</p>

      <div className="record-comparison record-comparison--material">
        {records.map((record) => (
          <button
            type="button"
            key={record.id}
            className={`record-slip ${selected.has(record.id) ? "is-reviewed" : ""}`}
            style={{ "--record-texture": `url("${record.texture}")` } as CSSProperties}
            onClick={() => inspect(record.id)}
            aria-pressed={selected.has(record.id)}
          >
            <span>{record.source}</span><strong>{record.time}</strong><small>{selected.has(record.id) ? record.detail : "点击展开复印件"}</small><em>{record.anchor}</em>
          </button>
        ))}
      </div>

      <TimelineAlignment offset={offset} onChange={updateOffset} />

      <div className="timeline-submit-row">
        <p className="puzzle-feedback" role="status">{feedback || `资料检查 ${reviewed.length}/${records.length}；对齐后由你确认校时结果。`}</p>
        <button type="button" className="primary-action" onClick={submit}>确认校时结果</button>
      </div>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.schedule.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.schedule[hintIndex]}</p>}
    </section>
  );
}
