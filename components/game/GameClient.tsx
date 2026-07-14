"use client";

import { useEffect, useState } from "react";
import { BootSequence } from "@/components/boot/BootSequence";
import { InvestigationDesktop } from "@/components/desktop/InvestigationDesktop";
import { EndingScreen } from "@/components/narrative/EndingScreen";
import { hydrateCaseStore, useCaseStore } from "@/store/case-store";

export function GameClient() {
  const hydrated = useCaseStore((state) => state.hydrated);
  const ending = useCaseStore((state) => state.currentEnding);
  const [sessionActive, setSessionActive] = useState(false);
  useEffect(() => { void hydrateCaseStore(); }, []);
  if (!hydrated) return <main className="loading-screen" aria-label="正在读取本地档案"><span className="loading-pulse" aria-hidden="true" /><p>读取潮湿的纸张与尚未对齐的时间……</p></main>;
  if (ending) return <EndingScreen onRestart={() => setSessionActive(true)} />;
  if (!sessionActive) return <BootSequence onEnter={() => setSessionActive(true)} />;
  return <InvestigationDesktop onLeave={() => setSessionActive(false)} />;
}

