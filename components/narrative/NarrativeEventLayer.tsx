"use client";

import { useMemo } from "react";
import { AmbientMessage } from "@/components/narrative/AmbientMessage";
import { getNextNarrativeEvent } from "@/lib/narrative-engine";
import { useCaseStore } from "@/store/case-store";
import type { WindowNavigationTarget } from "@/types/case";

interface NarrativeEventLayerProps {
  onNavigate: (target: WindowNavigationTarget) => void;
}

export function NarrativeEventLayer({ onNavigate }: NarrativeEventLayerProps) {
  const completedPuzzles = useCaseStore((state) => state.completedPuzzles);
  const readDocumentIds = useCaseStore((state) => state.readDocumentIds);
  const readEvidenceIds = useCaseStore((state) => state.readEvidenceIds);
  const discoveredAnonymous = useCaseStore((state) => state.discoveredAnonymous);
  const provisionalTheory = useCaseStore((state) => state.provisionalTheory);
  const theoryHistory = useCaseStore((state) => state.theoryHistory);
  const currentEnding = useCaseStore((state) => state.currentEnding);
  const unlockQueue = useCaseStore((state) => state.unlockQueue);
  const seenNarrativeEvents = useCaseStore((state) => state.seenNarrativeEvents);
  const markNarrativeEventSeen = useCaseStore((state) => state.markNarrativeEventSeen);
  const context = useMemo(() => ({
    completedPuzzles,
    readDocumentIds,
    readEvidenceIds,
    discoveredAnonymous,
    provisionalTheory,
    theoryHistory,
    currentEnding,
  }), [completedPuzzles, currentEnding, discoveredAnonymous, provisionalTheory, readDocumentIds, readEvidenceIds, theoryHistory]);

  const activeEvent = unlockQueue.length === 0
    ? getNextNarrativeEvent(context, seenNarrativeEvents)
    : null;
  if (!activeEvent) return null;

  return (
    <div className="narrative-event-layer" aria-live="polite">
      <AmbientMessage
        event={activeEvent}
        onDismiss={() => markNarrativeEventSeen(activeEvent.id)}
        onNavigate={activeEvent.target ? () => {
          onNavigate(activeEvent.target!);
          markNarrativeEventSeen(activeEvent.id);
        } : undefined}
      />
    </div>
  );
}
