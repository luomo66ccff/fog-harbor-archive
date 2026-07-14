"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Archive, CassetteTape, Cctv, Clock3, FileKey2, LockKeyhole, Mail, Map, Network, NotebookPen,
  Settings, UsersRound, Volume2, VolumeX,
} from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { CurrentTaskCard } from "@/components/desktop/CurrentTaskCard";
import { HarborAtmosphere } from "@/components/desktop/HarborAtmosphere";
import { LockedModuleDialog } from "@/components/desktop/LockedModuleDialog";
import { UnlockNotificationQueue } from "@/components/desktop/UnlockNotificationQueue";
import { EnvironmentalSecrets } from "@/components/narrative/EnvironmentalSecrets";
import { NarrativeEventLayer } from "@/components/narrative/NarrativeEventLayer";
import { ArchiveWindow } from "@/components/windows/ArchiveWindow";
import { EvidenceWindow } from "@/components/windows/EvidenceWindow";
import { FinaleWindow } from "@/components/windows/FinaleWindow";
import { PeopleWindow, MapWindow, TimelineWindow, InboxWindow } from "@/components/windows/RecordsWindows";
import { AudioWindow, SurveillanceWindow, NotesWindow, SettingsWindow } from "@/components/windows/UtilityWindows";
import {
  calculateProgress,
  credibilityLabel,
  getCurrentInvestigationTask,
  getModuleAccess,
  taskTarget,
  type LockedModuleAccess,
} from "@/lib/progression-engine";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";
import type { InvestigationTask, InvestigationTaskId, PuzzleId, WindowId, WindowNavigationTarget } from "@/types/case";

const modules: { id: WindowId; label: string; code: string; icon: typeof Archive; deskClass: string; completion?: PuzzleId }[] = [
  { id: "archive", label: "案件档案", code: "A-01", icon: Archive, deskClass: "object-archive", completion: "schedule" },
  { id: "people", label: "人物关系", code: "P-06", icon: UsersRound, deskClass: "object-people" },
  { id: "map", label: "港区地图", code: "M-07", icon: Map, deskClass: "object-map", completion: "hidden" },
  { id: "timeline", label: "时间线", code: "T-11", icon: Clock3, deskClass: "object-timeline", completion: "schedule" },
  { id: "inbox", label: "收件箱", code: "I-06", icon: Mail, deskClass: "object-inbox" },
  { id: "audio", label: "录音带", code: "R-03", icon: CassetteTape, deskClass: "object-audio", completion: "frequency" },
  { id: "surveillance", label: "监控室", code: "CCTV", icon: Cctv, deskClass: "object-cctv", completion: "photo" },
  { id: "evidence", label: "证据墙", code: "E-21", icon: Network, deskClass: "object-evidence", completion: "deduction" },
  { id: "notes", label: "调查笔记", code: "NOTE", icon: NotebookPen, deskClass: "object-notes" },
  { id: "settings", label: "系统设置", code: "SYS", icon: Settings, deskClass: "object-settings" },
  { id: "finale", label: "最终档案", code: "FINAL", icon: FileKey2, deskClass: "object-finale", completion: "deduction" },
];

function storyClock(completed: readonly PuzzleId[]) {
  if (completed.includes("deduction")) return "03:07";
  if (completed.includes("photo")) return "02:57";
  if (completed.includes("frequency")) return "02:41";
  if (completed.includes("schedule")) return "02:29";
  return "02:17";
}

export function InvestigationDesktop({ onLeave }: { onLeave: () => void }) {
  const code = useCaseStore((state) => state.investigatorCode);
  const runCount = useCaseStore((state) => state.runCount);
  const completed = useCaseStore((state) => state.completedPuzzles);
  const evidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const anonymous = useCaseStore((state) => state.discoveredAnonymous);
  const currentEnding = useCaseStore((state) => state.currentEnding);
  const puzzleAttempts = useCaseStore((state) => state.puzzleAttempts);
  const taskProgress = useCaseStore((state) => state.taskProgress);
  const audio = useCaseStore((state) => state.audio);
  const updateAudio = useCaseStore((state) => state.updateAudio);
  const openWindows = useWindowStore((state) => state.openWindows);
  const minimized = useWindowStore((state) => state.minimized);
  const openWindow = useWindowStore((state) => state.openWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const started = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const [lockedAccess, setLockedAccess] = useState<LockedModuleAccess | null>(null);
  const [hintLevels, setHintLevels] = useState<Partial<Record<InvestigationTaskId, number>>>({});
  const [idleReadyTaskKey, setIdleReadyTaskKey] = useState<string | null>(null);
  const { cue } = useFogAudio();

  const progress = calculateProgress(completed, evidenceIds.length, anonymous);
  const credibility = credibilityLabel(completed, evidenceIds.length);
  const currentTask = useMemo(() => getCurrentInvestigationTask({
    completedPuzzles: completed,
    currentEnding,
    taskProgress,
  }), [completed, currentEnding, taskProgress]);
  const clock = storyClock(completed);
  const hintLevel = hintLevels[currentTask.id] ?? -1;
  const currentTaskKey = `${runCount}:${currentTask.id}`;
  const idleHintReady = idleReadyTaskKey === currentTaskKey;
  const activePuzzleAttempts = currentTask.puzzleId ? puzzleAttempts[currentTask.puzzleId] ?? 0 : 0;
  const windowsVisible = openWindows.some((id) => !minimized.includes(id));

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openWindow("inbox");
    const timer = window.setTimeout(() => cue("horn"), 900);
    return () => window.clearTimeout(timer);
  }, [cue, openWindow]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Escape" && !lockedAccess) {
        const active = useWindowStore.getState().activeWindow;
        if (active) closeWindow(active);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWindow, lockedAccess]);

  useEffect(() => {
    const taskKey = `${runCount}:${currentTask.id}`;
    const armTimer = () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setIdleReadyTaskKey(taskKey), 90000);
    };
    const onActivity = () => {
      if (!document.hidden) {
        armTimer();
      }
    };
    armTimer();
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [currentTask.id, runCount]);

  const navigate = (target: WindowNavigationTarget) => {
    const { windowId, tab, focusId } = target;
    if (tab || focusId) openWindow(windowId, { tab, focusId });
    else openWindow(windowId);
  };

  const navigateTask = (task: InvestigationTask) => {
    cue("paper");
    navigate(taskTarget(task));
  };

  const launch = (id: WindowId) => {
    const access = getModuleAccess(completed, id);
    if (!access.unlocked) {
      setLockedAccess(access);
      cue("error");
      return;
    }
    cue(id === "audio" ? "tape" : "paper");
    openWindow(id);
  };

  return (
    <main className="investigation-desktop" data-story-time={clock}>
      <HarborAtmosphere dimmed={windowsVisible} />
      <EnvironmentalSecrets frequencySolved={completed.includes("frequency")} runCount={runCount} />
      <div className="desk-grain" aria-hidden="true" />
      <header className="case-statusbar">
        <div><span className="status-seal">雾港港务局</span><strong>P-07-0712</strong><small>调查员 / {code}</small></div>
        <div className="case-metrics"><span>档案完整度 <strong>{progress}%</strong></span><span>证据可信度 <strong>{credibility}</strong></span><span>当前时间 <strong className="story-clock" key={clock}>{clock}</strong></span><button type="button" className="sound-toggle" onClick={() => updateAudio({ muted: !audio.muted })} aria-label={audio.muted ? "开启声音" : "关闭声音"}>{audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>
      </header>

      <CurrentTaskCard
        task={currentTask}
        onNavigate={navigateTask}
        revealedHintLevel={hintLevel}
        hintAvailable={idleHintReady || activePuzzleAttempts >= 2}
        onRequestHint={() => setHintLevels((levels) => ({
          ...levels,
          [currentTask.id]: Math.min((levels[currentTask.id] ?? -1) + 1, currentTask.hintLevels.length - 1),
        }))}
        className="desk-brief"
      />

      <section className="desk-objects" aria-label="调查终端应用">
        <span className="mobile-launcher-label">调查应用</span>
        {modules.map((item) => {
          const access = getModuleAccess(completed, item.id);
          const unlocked = access.unlocked;
          const complete = item.completion ? completed.includes(item.completion) : false;
          const Icon = item.icon;
          return <button type="button" key={item.id} className={`desk-object ${item.deskClass} ${unlocked ? "" : "is-locked"} ${complete ? "is-complete" : ""}`} onClick={() => launch(item.id)} data-locked={!unlocked || undefined} aria-haspopup={unlocked ? undefined : "dialog"} title={unlocked ? `打开${item.label}` : access.missing}><span className="object-surface"><Icon size={25} aria-hidden="true" />{!unlocked && <LockKeyhole className="object-lock" size={13} aria-hidden="true" />}</span><strong>{item.label}</strong><small>{unlocked ? complete ? "已完成" : item.code : access.missing}</small></button>;
        })}
      </section>

      <AnimatePresence>
        {openWindows.includes("archive") && <ArchiveWindow key="archive" />}
        {openWindows.includes("people") && <PeopleWindow key="people" />}
        {openWindows.includes("map") && <MapWindow key="map" />}
        {openWindows.includes("timeline") && <TimelineWindow key="timeline" />}
        {openWindows.includes("inbox") && <InboxWindow key="inbox" />}
        {openWindows.includes("audio") && <AudioWindow key="audio" />}
        {openWindows.includes("surveillance") && <SurveillanceWindow key="surveillance" />}
        {openWindows.includes("evidence") && <EvidenceWindow key="evidence" />}
        {openWindows.includes("notes") && <NotesWindow key="notes" />}
        {openWindows.includes("settings") && <SettingsWindow key="settings" onLeave={onLeave} />}
        {openWindows.includes("finale") && <FinaleWindow key="finale" />}
      </AnimatePresence>

      <nav className="case-dock" aria-label="案件工具栏">
        {modules.map((item) => {
          const Icon = item.icon;
          const access = getModuleAccess(completed, item.id);
          const isOpen = openWindows.includes(item.id) && !minimized.includes(item.id);
          return <button type="button" key={item.id} data-window-dock={item.id} data-locked={!access.unlocked || undefined} className={`${isOpen ? "is-open" : ""} ${access.unlocked ? "" : "is-locked"}`} onClick={() => minimized.includes(item.id) && access.unlocked ? restoreWindow(item.id) : launch(item.id)} aria-haspopup={access.unlocked ? undefined : "dialog"} aria-label={`${isOpen ? "切换到" : "打开"}${item.label}${access.unlocked ? "" : "，当前锁定，查看所需线索"}`}><Icon size={18} /><span>{item.label}</span>{!access.unlocked && <LockKeyhole className="dock-lock" size={9} aria-hidden="true" />}</button>;
        })}
      </nav>

      <UnlockNotificationQueue />
      <NarrativeEventLayer onNavigate={navigate} />
      <LockedModuleDialog access={lockedAccess} onClose={() => setLockedAccess(null)} onNavigate={navigate} />
    </main>
  );
}
