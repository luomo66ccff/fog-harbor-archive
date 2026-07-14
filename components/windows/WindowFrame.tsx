"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useReducedMotion } from "framer-motion";
import { Minus, X } from "lucide-react";
import { useWindowStore } from "@/store/window-store";
import type { WindowId } from "@/types/case";

export type WindowVariant = "paper" | "terminal" | "metal" | "crt" | "cork" | "map" | "final";

const defaultWindowVariant: Record<WindowId, WindowVariant> = {
  archive: "paper",
  people: "paper",
  map: "map",
  timeline: "terminal",
  inbox: "terminal",
  audio: "metal",
  surveillance: "crt",
  evidence: "cork",
  notes: "paper",
  settings: "terminal",
  finale: "final",
};

const motionByVariant: Record<WindowVariant, { initial: { opacity: number; y?: number; scale?: number; rotate?: number }; exit: { opacity: number; y?: number; scale?: number } }> = {
  paper: { initial: { opacity: 0, y: 14, rotate: -0.35 }, exit: { opacity: 0, y: 8 } },
  terminal: { initial: { opacity: 0, y: 6, scale: 0.992 }, exit: { opacity: 0, scale: 0.996 } },
  metal: { initial: { opacity: 0, y: 12, scale: 0.995 }, exit: { opacity: 0, y: 7 } },
  crt: { initial: { opacity: 0, scale: 0.985 }, exit: { opacity: 0, scale: 0.992 } },
  cork: { initial: { opacity: 0, y: 12, rotate: 0.2 }, exit: { opacity: 0, y: 8 } },
  map: { initial: { opacity: 0, y: 16, rotate: -0.2 }, exit: { opacity: 0, y: 9 } },
  final: { initial: { opacity: 0, y: 18, scale: 0.99 }, exit: { opacity: 0, y: 10 } },
};

interface WindowFrameProps {
  id: WindowId;
  title: string;
  index: string;
  children: React.ReactNode;
  className?: string;
  variant?: WindowVariant;
}

export function WindowFrame({ id, title, index, children, className = "", variant = defaultWindowVariant[id] }: WindowFrameProps) {
  const activeWindow = useWindowStore((state) => state.activeWindow);
  const minimized = useWindowStore((state) => state.minimized.includes(id));
  const zIndex = useWindowStore((state) => state.zOrder[id] ?? 120);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const windowRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (activeWindow === id) windowRef.current?.focus({ preventScroll: true });
  }, [activeWindow, id]);

  const returnFocusToDock = () => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-window-dock="${id}"]`)?.focus();
    });
  };

  if (minimized) return null;
  const motionPreset = motionByVariant[variant];
  return (
    <motion.section
      ref={windowRef}
      className={`case-window window-${id} window-variant-${variant} ${activeWindow === id ? "is-active" : ""} ${mobile && activeWindow !== id ? "is-mobile-hidden" : ""} ${className}`}
      data-window-variant={variant}
      style={{ zIndex }} initial={reduceMotion ? { opacity: 0 } : motionPreset.initial} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={reduceMotion ? { opacity: 0 } : motionPreset.exit}
      drag={!mobile} dragListener={false} dragControls={dragControls} dragMomentum={false} dragConstraints={{ left: -260, right: 260, top: -120, bottom: 170 }} dragElastic={0.04}
      onPointerDown={() => focusWindow(id)} role="region" aria-labelledby={`${id}-window-title`} aria-hidden={mobile && activeWindow !== id} tabIndex={-1}
    >
      <header
        className="window-handle"
        onPointerDown={(event) => {
          focusWindow(id);
          if (!mobile && event.button === 0 && !(event.target as HTMLElement).closest("button")) dragControls.start(event);
        }}
      >
        <div><span>{index}</span><strong id={`${id}-window-title`}>{title}</strong></div>
        <div className="window-controls">
          <button type="button" onClick={() => { minimizeWindow(id); returnFocusToDock(); }} aria-label={`最小化${title}`}><Minus size={15} /></button>
          <button type="button" onClick={() => { closeWindow(id); returnFocusToDock(); }} aria-label={`关闭${title}`}><X size={15} /></button>
        </div>
      </header>
      <div className="window-content">{children}</div>
    </motion.section>
  );
}
