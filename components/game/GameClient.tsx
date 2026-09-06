"use client";

import { useEffect, useState } from "react";
import { BootSequence } from "@/components/boot/BootSequence";
import { InvestigationDesktop } from "@/components/desktop/InvestigationDesktop";
import { EndingScreen } from "@/components/narrative/EndingScreen";
import { hydrateCaseStore, useCaseStore } from "@/store/case-store";
import { SaveStatusNotice } from "@/components/game/SaveBackupPanel";

export function GameClient() {
  const hydrated = useCaseStore((state) => state.hydrated);
  const ending = useCaseStore((state) => state.currentEnding);
  const [sessionActive, setSessionActive] = useState(false);
  useEffect(() => { void hydrateCaseStore(); }, []);
  if (!hydrated) return <main className="loading-screen" aria-label="正在读取本地档案"><span className="loading-pulse" aria-hidden="true" /><p>读取潮湿的纸张与尚未对齐的时间……</p></main>;
  return <><SaveStatusNotice />{ending
    ? <EndingScreen onRestart={() => setSessionActive(true)} />
    : !sessionActive
      ? <BootSequence onEnter={() => setSessionActive(true)} />
      : <InvestigationDesktop onLeave={() => setSessionActive(false)} />}</>;
}
