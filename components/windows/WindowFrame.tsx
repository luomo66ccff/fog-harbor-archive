"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { Minus, X } from "lucide-react";
import { useWindowStore } from "@/store/window-store";
import type { WindowId } from "@/types/case";

export function WindowFrame({ id, title, index, children, className = "" }: { id: WindowId; title: string; index: string; children: React.ReactNode; className?: string }) {
  const activeWindow = useWindowStore((state) => state.activeWindow);
  const minimized = useWindowStore((state) => state.minimized.includes(id));
  const zIndex = useWindowStore((state) => state.zOrder[id] ?? 120);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const dragControls = useDragControls();
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
  return (
    <motion.section
      ref={windowRef}
      className={`case-window window-${id} ${activeWindow === id ? "is-active" : ""} ${mobile && activeWindow !== id ? "is-mobile-hidden" : ""} ${className}`}
      style={{ zIndex }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      drag={!mobile} dragListener={false} dragControls={dragControls} dragMomentum={false} dragConstraints={{ left: -260, right: 260, top: -120, bottom: 170 }} dragElastic={0.04}
      onPointerDown={() => focusWindow(id)} role="region" aria-labelledby={`${id}-window-title`} tabIndex={-1}
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
