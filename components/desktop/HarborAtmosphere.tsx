"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { visualAssets } from "@/lib/visual-assets";

interface HarborAtmosphereProps {
  dimmed?: boolean;
  runCount?: number;
  className?: string;
}

export function HarborAtmosphere({ dimmed = false, runCount = 1, className = "" }: HarborAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [reduceData, setReduceData] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setPaused(document.visibilityState !== "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-data: reduce)");
    const updatePreference = () => setReduceData(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduceMotion || reduceData) {
      root?.style.setProperty("--harbor-shift-x", "0px");
      root?.style.setProperty("--harbor-shift-y", "0px");
      return;
    }

    const pointerQuery = window.matchMedia("(pointer: fine) and (min-width: 761px)");
    const updateShift = (event: PointerEvent) => {
      if (!pointerQuery.matches || document.visibilityState !== "visible") return;
      const { clientX, clientY } = event;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const bounds = root.getBoundingClientRect();
        const normalizedX = Math.max(-1, Math.min(1, ((clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2));
        const normalizedY = Math.max(-1, Math.min(1, ((clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2));
        root.style.setProperty("--harbor-shift-x", `${(normalizedX * 8).toFixed(2)}px`);
        root.style.setProperty("--harbor-shift-y", `${(normalizedY * 6).toFixed(2)}px`);
      });
    };
    const resetShift = () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
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
  }, [reduceData, reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={`harbor-atmosphere ${dimmed ? "is-dimmed" : ""} ${paused ? "is-paused" : ""} ${reduceMotion ? "is-reduced-motion" : ""} ${reduceData ? "is-reduced-data" : ""} ${runCount >= 2 ? "is-replay" : ""} ${className}`.trim()}
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
      {runCount >= 2 && <div className="harbor-replay-figure" />}
      <div className="harbor-foreground-plane" />
    </div>
  );
}
