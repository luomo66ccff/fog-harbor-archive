"use client";

import { ArrowUpRight, Radio, X } from "lucide-react";
import type { NarrativeEvent } from "@/types/narrative";

const sourceLabels: Record<NarrativeEvent["source"], string> = {
  system: "SYSTEM WATCH",
  "tide-0": "TIDE_0 / UNVERIFIED",
  archive: "ARCHIVE ANNOTATION",
  memory: "INVESTIGATOR MEMORY",
};

interface AmbientMessageProps {
  event: NarrativeEvent;
  onDismiss: () => void;
  onNavigate?: () => void;
}

export function AmbientMessage({ event, onDismiss, onNavigate }: AmbientMessageProps) {
  return (
    <aside className={`ambient-message source-${event.source}`} role="status" aria-labelledby={`narrative-${event.id}`} data-narrative-event={event.id}>
      <header>
        <Radio size={15} aria-hidden="true" />
        <span>{sourceLabels[event.source]}</span>
        <button type="button" onClick={onDismiss} aria-label="关闭叙事提示"><X size={15} /></button>
      </header>
      <div>
        {event.title && <h2 id={`narrative-${event.id}`}>{event.title}</h2>}
        {event.body.slice(0, 3).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      {event.target && onNavigate && <button type="button" className="ambient-message__target" onClick={onNavigate}>查看关联档案 <ArrowUpRight size={14} aria-hidden="true" /></button>}
    </aside>
  );
}
