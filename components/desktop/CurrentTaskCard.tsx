"use client";

import { useId } from "react";
import { LocateFixed, Search } from "lucide-react";
import type { InvestigationTask } from "@/types/case";

export interface CurrentTaskCardProps {
  task: InvestigationTask;
  onNavigate: (task: InvestigationTask) => void;
  revealedHintLevel?: number;
  hintAvailable?: boolean;
  onRequestHint?: () => void;
  className?: string;
}

export function CurrentTaskCard({
  task,
  onNavigate,
  revealedHintLevel = -1,
  hintAvailable = false,
  onRequestHint,
  className = "",
}: CurrentTaskCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const normalizedHintLevel = Math.min(
    Math.max(-1, revealedHintLevel),
    task.hintLevels.length - 1,
  );
  const visibleHint = normalizedHintLevel >= 0 ? task.hintLevels[normalizedHintLevel] : null;
  const canRequestHint = hintAvailable && Boolean(onRequestHint) && normalizedHintLevel < task.hintLevels.length - 1;

  return (
    <section
      className={`current-task-card ${task.completed ? "is-completed" : ""} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-task-id={task.id}
    >
      <button
        type="button"
        className="current-task-target"
        onClick={() => onNavigate(task)}
        aria-label={`定位当前任务：${task.title}`}
      >
        <span className="current-task-kicker">CURRENT TASK</span>
        <strong id={titleId}>{task.title}</strong>
        <span id={descriptionId}>{task.description}</span>
        {task.progressLabel && <small aria-label={`任务进度：${task.progressLabel}`}>{task.progressLabel}</small>}
        <span className="current-task-action"><LocateFixed size={15} aria-hidden="true" /> 定位线索</span>
      </button>

      <div className="current-task-hint" aria-live="polite" aria-atomic="true">
        {visibleHint && <p><span>提示 {normalizedHintLevel + 1}</span>{visibleHint}</p>}
        {canRequestHint && (
          <button type="button" onClick={onRequestHint} aria-label={`请求“${task.title}”的下一层提示`}>
            <Search size={14} aria-hidden="true" /> 请求渐进提示
          </button>
        )}
      </div>
    </section>
  );
}
