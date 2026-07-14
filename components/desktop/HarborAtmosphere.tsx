"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { visualAssets } from "@/lib/visual-assets";

interface HarborAtmosphereProps {
  dimmed?: boolean;
  className?: string;
}

export function HarborAtmosphere({ dimmed = false, className = "" }: HarborAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setPaused(document.visibilityState !== "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduceMotion) {
      root?.style.setProperty("--harbor-shift-x", "0px");
      root?.style.setProperty("--harbor-shift-y", "0px");
      return;
    }

    const pointerQuery = window.matchMedia("(pointer: fine) and (min-width: 761px)");
    const updateShift = (event: PointerEvent) => {
      if (!pointerQuery.matches || document.visibilityState !== "visible") return;
      const bounds = root.getBoundingClientRect();
      const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2));
      const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2));
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        root.style.setProperty("--harbor-shift-x", `${(normalizedX * 8).toFixed(2)}px`);
        root.style.setProperty("--harbor-shift-y", `${(normalizedY * 6).toFixed(2)}px`);
      });
    };
    const resetShift = () => {
      root.style.setProperty("--harbor-shift-x", "0px");
      root.style.setProperty("--harbor-shift-y", "0px");
    };

    window.addEventListener("pointermove", updateShift, { passive: true });
    window.addEventListener("blur", resetShift);
    return () => {
      window.removeEventListener("pointermove", updateShift);
      window.removeEventListener("blur", resetShift);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={`harbor-atmosphere ${dimmed ? "is-dimmed" : ""} ${paused ? "is-paused" : ""} ${reduceMotion ? "is-reduced-motion" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <div className="harbor-scene-plane" style={{ backgroundImage: `url(${visualAssets.desktop})` }} />
      <div className="harbor-depth-plane" />
      <div className="harbor-rain-plane rain-far" />
      <div className="harbor-rain-plane rain-near" />
      <div className="harbor-fog-plane fog-bank-one" />
      <div className="harbor-fog-plane fog-bank-two" />
      <div className="harbor-glass-plane"><i /><i /><i /><i /></div>
      <div className="harbor-light-plane"><i /><i /><i /></div>
      <div className="harbor-foreground-plane" />
    </div>
  );
}
