"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Radio, X } from "lucide-react";

export type CinematicTone = "system" | "archive" | "tide-0" | "memory";

interface CinematicCaptionProps {
  eventId: string;
  eyebrow: string;
  title?: string;
  body: readonly string[];
  tone: CinematicTone;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function CinematicCaption({
  eventId,
  eyebrow,
  title,
  body,
  tone,
  onDismiss,
  actionLabel,
  onAction,
}: CinematicCaptionProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <motion.aside
      className={`cinematic-caption tone-${tone}`}
      data-cinematic-caption={eventId}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby={title ? titleId : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
      transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="cinematic-caption__header">
        <Radio size={15} aria-hidden="true" />
        <span>{eyebrow}</span>
        <button type="button" onClick={onDismiss} aria-label="关闭演出字幕"><X size={16} aria-hidden="true" /></button>
      </header>
      <div className="cinematic-caption__copy">
        {title && <h2 id={titleId}>{title}</h2>}
        {body.slice(0, 3).map((paragraph, index) => <p key={`${eventId}:${index}`}>{paragraph}</p>)}
      </div>
      {actionLabel && onAction && (
        <button type="button" className="cinematic-caption__action" onClick={onAction}>
          {actionLabel}<ArrowUpRight size={14} aria-hidden="true" />
        </button>
      )}
    </motion.aside>
  );
}
