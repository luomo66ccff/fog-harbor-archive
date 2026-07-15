"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CinematicCaption } from "@/components/cinematic/CinematicCaption";
import { ScenePulse, type ScenePulseIntensity } from "@/components/cinematic/ScenePulse";
import { usePageVisibility } from "@/components/hooks/usePageVisibility";
import { getCinematicPresentation, getNextCinematicEvent } from "@/lib/cinematic-engine";
import { useCaseStore } from "@/store/case-store";
import type { WindowNavigationTarget } from "@/types/case";
import type { CinematicEvent, CinematicEventId } from "@/types/narrative";

const toneByEvent: Record<CinematicEventId, "system" | "archive" | "tide-0" | "memory"> = {
  "time-restored": "archive",
  "tape-signal-locked": "tide-0",
  "photo-restored": "archive",
  "theory-corrected": "memory",
  "chain-closed": "system",
  "external-reader": "system",
  "ending-truth": "archive",
  "ending-trade": "memory",
  "ending-seventh": "system",
};

const strongEvents = new Set<CinematicEventId>([
  "chain-closed",
  "external-reader",
  "ending-truth",
  "ending-trade",
  "ending-seventh",
]);

const softEvents = new Set<CinematicEventId>([
  "theory-corrected",
]);

function intensityForEvent(id: CinematicEventId): ScenePulseIntensity {
  if (strongEvents.has(id)) return "strong";
  if (softEvents.has(id)) return "soft";
  return "medium";
}

interface CinematicEventLayerProps {
  onNavigate?: (target: WindowNavigationTarget) => void;
  onEventStart?: (event: CinematicEvent) => void;
}

export function CinematicEventLayer({ onNavigate, onEventStart }: CinematicEventLayerProps) {
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const theoryHistory = useCaseStore((state) => state.theoryHistory);
  const seenNarrativeEvents = useCaseStore((state) => state.seenNarrativeEvents);
  const currentEnding = useCaseStore((state) => state.currentEnding);
  const seenCinematicEvents = useCaseStore((state) => state.seenCinematicEvents);
  const markCinematicEventSeen = useCaseStore((state) => state.markCinematicEventSeen);
  const reduceMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const onEventStartRef = useRef(onEventStart);
  const startedEventRef = useRef<CinematicEventId | null>(null);
  useEffect(() => {
    onEventStartRef.current = onEventStart;
  }, [onEventStart]);
  const context = useMemo(() => ({
    completedPuzzles,
    theoryHistory,
    seenNarrativeEvents,
    currentEnding,
  }), [completedPuzzles, currentEnding, seenNarrativeEvents, theoryHistory]);
  const activeEvent = getNextCinematicEvent(context, seenCinematicEvents);
  const presentation = activeEvent
    ? getCinematicPresentation(activeEvent, Boolean(reduceMotion))
    : null;

  useEffect(() => {
    if (!activeEvent) return;
    document.documentElement.dataset.cinematicEvent = activeEvent.id;
    return () => {
      if (document.documentElement.dataset.cinematicEvent === activeEvent.id) {
        delete document.documentElement.dataset.cinematicEvent;
      }
    };
  }, [activeEvent]);

  useEffect(() => {
    if (!activeEvent || pageVisible) {
      delete document.documentElement.dataset.cinematicPaused;
      return;
    }
    document.documentElement.dataset.cinematicPaused = "true";
    return () => {
      delete document.documentElement.dataset.cinematicPaused;
    };
  }, [activeEvent, pageVisible]);

  useEffect(() => {
    if (!activeEvent
      || reduceMotion
      || !pageVisible
      || document.visibilityState !== "visible"
      || startedEventRef.current === activeEvent.id) return;
    startedEventRef.current = activeEvent.id;
    onEventStartRef.current?.(activeEvent);
  }, [activeEvent, pageVisible, reduceMotion]);

  useEffect(() => {
    if (!activeEvent || !presentation || !pageVisible) return;
    const timer = window.setTimeout(
      () => markCinematicEventSeen(activeEvent.id),
      presentation.durationMs,
    );
    return () => window.clearTimeout(timer);
  }, [activeEvent, markCinematicEventSeen, pageVisible, presentation]);

  const dismiss = () => {
    if (activeEvent) markCinematicEventSeen(activeEvent.id);
  };
  const navigate = () => {
    if (!activeEvent?.target || !onNavigate) return;
    onNavigate(activeEvent.target);
    markCinematicEventSeen(activeEvent.id);
  };

  return (
    <div className={`cinematic-event-layer ${pageVisible ? "" : "is-paused"}`}>
      <AnimatePresence mode="wait">
        {activeEvent && (
          <motion.div className="cinematic-event-layer__event" key={activeEvent.id} data-cinematic-event={activeEvent.id} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!reduceMotion && activeEvent.pulse.kind !== "sound" && <ScenePulse eventId={activeEvent.id} tone={toneByEvent[activeEvent.id]} intensity={intensityForEvent(activeEvent.id)} />}
            <CinematicCaption
              eventId={activeEvent.id}
              eyebrow={`CINEMATIC / ${activeEvent.pulse.kind.toUpperCase()}`}
              title={presentation?.caption}
              body={reduceMotion ? [] : [activeEvent.environment.description]}
              tone={toneByEvent[activeEvent.id]}
              onDismiss={dismiss}
              actionLabel={activeEvent.target && onNavigate ? "查看关联档案" : undefined}
              onAction={activeEvent.target && onNavigate ? navigate : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
