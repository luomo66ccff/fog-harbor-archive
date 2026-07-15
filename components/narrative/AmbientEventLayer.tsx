"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Eye, Radio } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { useIdleActivity } from "@/components/hooks/useIdleActivity";
import { usePageVisibility } from "@/components/hooks/usePageVisibility";
import {
  ambientEvents,
  getAmbientEventDelay,
  getPendingAmbientEvents,
} from "@/lib/ambient-event-engine";
import { useCaseStore } from "@/store/case-store";
import type { AmbientEventId } from "@/types/narrative";

export function AmbientEventLayer() {
  const runCount = useCaseStore((state) => state.runCount);
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const seed = useCaseStore((state) => state.ambientEventSeed);
  const seenAmbientEvents = useCaseStore((state) => state.seenAmbientEvents);
  const markAmbientEventSeen = useCaseStore((state) => state.markAmbientEventSeen);
  const reduceMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const { cueHarborPattern } = useFogAudio();
  const [activeId, setActiveId] = useState<AmbientEventId | null>(null);
  const playedSoundKeyRef = useRef("");

  const pending = useMemo(() => getPendingAmbientEvents(seed, {
    completedPuzzles,
    seenAmbientEvents,
  }), [completedPuzzles, seed, seenAmbientEvents]);
  const nextEvent = pending[0] ?? null;
  const activeEvent = activeId
    ? ambientEvents.find((event) => event.id === activeId) ?? null
    : null;
  const delay = nextEvent ? getAmbientEventDelay(seed, nextEvent) : 60_000;

  const revealNext = useCallback(() => {
    if (!nextEvent || activeId) return;
    markAmbientEventSeen(nextEvent.id);
    setActiveId(nextEvent.id);
  }, [activeId, markAmbientEventSeen, nextEvent]);

  useIdleActivity({
    enabled: runCount >= 2 && Boolean(nextEvent) && !activeEvent,
    timeoutMs: delay,
    onIdle: revealNext,
  });

  useEffect(() => {
    if (!activeEvent || !pageVisible) return;
    const timer = window.setTimeout(() => setActiveId(null), reduceMotion ? 8_000 : 6_500);
    return () => window.clearTimeout(timer);
  }, [activeEvent, pageVisible, reduceMotion]);

  useEffect(() => {
    if (activeEvent?.id !== "four-note-horn" || !pageVisible || reduceMotion) return;
    const soundKey = `${runCount}:${activeEvent.id}`;
    if (playedSoundKeyRef.current === soundKey) return;
    playedSoundKeyRef.current = soundKey;
    cueHarborPattern();
  }, [activeEvent, cueHarborPattern, pageVisible, reduceMotion, runCount]);

  if (!activeEvent) return null;
  const text = reduceMotion ? activeEvent.reducedMotion.text : activeEvent.text;

  return (
    <aside
      className={`ambient-event ambient-event--${activeEvent.effect} ${pageVisible ? "" : "is-paused"}`}
      data-ambient-event={activeEvent.id}
      role="status"
      aria-live="polite"
    >
      <span className="ambient-event__signal" aria-hidden="true"><Radio size={14} /></span>
      <div><span>LOCAL ANOMALY / RUN {String(runCount).padStart(2, "0")}</span><p>{text}</p></div>
      <Eye size={15} aria-hidden="true" />
    </aside>
  );
}
