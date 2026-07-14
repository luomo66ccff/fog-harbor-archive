"use client";

import type { CSSProperties } from "react";
import { MoveHorizontal } from "lucide-react";
import {
  TIMELINE_CORRECT_OFFSET,
  TIMELINE_MAX_OFFSET,
  TIMELINE_MIN_OFFSET,
  evaluateTimelineAlignment,
  snapTimelineOffset,
  timelineEvents,
} from "@/lib/puzzle-engine";

const TRACK_MINUTE = 10;
const TRACK_SPAN = 50;

function nodeStyle(minute: number): CSSProperties {
  const position = Math.min(100, Math.max(0, ((minute - TRACK_MINUTE) / TRACK_SPAN) * 100));
  return { "--timeline-node": `${position}%` } as CSSProperties;
}

interface TimelineAlignmentProps {
  offset: number;
  onChange: (offset: number, snapped: boolean) => void;
}

export function TimelineAlignment({ offset, onChange }: TimelineAlignmentProps) {
  const result = evaluateTimelineAlignment(offset);

  const changeOffset = (rawValue: number) => {
    const next = snapTimelineOffset(rawValue);
    onChange(next, next !== rawValue || (next === TIMELINE_CORRECT_OFFSET && offset !== next));
  };

  return (
    <section className={`timeline-aligner ${result.complete ? "is-aligned" : ""}`} aria-labelledby="timeline-aligner-title">
      <header className="timeline-aligner__header">
        <div>
          <p className="eyebrow">DUAL CLOCK CALIBRATION</p>
          <h4 id="timeline-aligner-title">双时间轴对齐台</h4>
        </div>
        <span className="timeline-aligner__state" aria-live="polite">
          {result.complete ? "磁吸锁定 / 节点重合" : `待对齐节点 ${result.misalignedIds.length}/${timelineEvents.length}`}
        </span>
      </header>

      <div className="timeline-axis timeline-axis--system">
        <div className="timeline-axis__label"><span>上轨</span><strong>港务系统时间</strong></div>
        <div className="timeline-axis__track" aria-hidden="true">
          {timelineEvents.map((event) => (
            <span key={event.id} className="timeline-node" style={nodeStyle(event.systemMinute)}>
              <i />
              <strong>{event.systemTime}</strong>
              <small>{event.label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="timeline-axis timeline-axis--physical">
        <div className="timeline-axis__label"><span>下轨</span><strong>物理记录时间</strong></div>
        <div className="timeline-axis__track">
          {timelineEvents.map((event) => {
            const aligned = result.alignedIds.includes(event.id);
            return (
              <span
                key={event.id}
                className={`timeline-node ${aligned ? "is-aligned" : ""}`}
                style={nodeStyle(event.physicalMinute + offset)}
                aria-hidden="true"
              >
                <i />
                <strong>{event.physicalTime}</strong>
                <small>{event.label}</small>
              </span>
            );
          })}
          <input
            className="timeline-axis__slider"
            type="range"
            min={TIMELINE_MIN_OFFSET}
            max={TIMELINE_MAX_OFFSET}
            step="1"
            value={offset}
            onChange={(event) => changeOffset(Number(event.target.value))}
            aria-label="左右移动物理时间轴"
            aria-describedby="timeline-control-help"
          />
        </div>
      </div>

      <p id="timeline-control-help" className="timeline-aligner__help">
        <MoveHorizontal size={15} aria-hidden="true" /> 拖动物理时间轴；聚焦后可用左右方向键逐分钟微调。共同事件接近时会自动磁吸。
      </p>
    </section>
  );
}
