"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive, CassetteTape, Cctv, Clock3, FileKey2, LockKeyhole, Mail, Map, Network, NotebookPen,
  Settings, UsersRound, Volume2, VolumeX,
} from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { ArchiveWindow } from "@/components/windows/ArchiveWindow";
import { EvidenceWindow } from "@/components/windows/EvidenceWindow";
import { FinaleWindow } from "@/components/windows/FinaleWindow";
import { PeopleWindow, MapWindow, TimelineWindow, InboxWindow } from "@/components/windows/RecordsWindows";
import { AudioWindow, SurveillanceWindow, NotesWindow, SettingsWindow } from "@/components/windows/UtilityWindows";
import { calculateProgress, credibilityLabel, isModuleUnlocked } from "@/lib/progression-engine";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";
import type { WindowId } from "@/types/case";

const modules: { id: WindowId; label: string; code: string; icon: typeof Archive; deskClass: string }[] = [
  { id: "archive", label: "案件档案", code: "A-01", icon: Archive, deskClass: "object-archive" },
  { id: "people", label: "人物关系", code: "P-06", icon: UsersRound, deskClass: "object-people" },
  { id: "map", label: "港区地图", code: "M-07", icon: Map, deskClass: "object-map" },
  { id: "timeline", label: "时间线", code: "T-11", icon: Clock3, deskClass: "object-timeline" },
  { id: "inbox", label: "收件箱", code: "I-06", icon: Mail, deskClass: "object-inbox" },
  { id: "audio", label: "录音带", code: "R-03", icon: CassetteTape, deskClass: "object-audio" },
  { id: "surveillance", label: "监控室", code: "CCTV", icon: Cctv, deskClass: "object-cctv" },
  { id: "evidence", label: "证据墙", code: "E-21", icon: Network, deskClass: "object-evidence" },
  { id: "notes", label: "调查笔记", code: "NOTE", icon: NotebookPen, deskClass: "object-notes" },
  { id: "settings", label: "系统设置", code: "SYS", icon: Settings, deskClass: "object-settings" },
  { id: "finale", label: "最终档案", code: "FINAL", icon: FileKey2, deskClass: "object-finale" },
];

const unlockCopy: Partial<Record<WindowId, string>> = {
  audio: "校准时间链后恢复",
  surveillance: "解析纸带口令后恢复",
  evidence: "复原港口照片后开放",
  finale: "闭合责任链后开放",
};

export function InvestigationDesktop({ onLeave }: { onLeave: () => void }) {
  const code = useCaseStore((state) => state.investigatorCode);
  const completed = useCaseStore((state) => state.completedPuzzles);
  const evidenceIds = useCaseStore((state) => state.unlockedEvidenceIds);
  const anonymous = useCaseStore((state) => state.discoveredAnonymous);
  const audio = useCaseStore((state) => state.audio);
  const updateAudio = useCaseStore((state) => state.updateAudio);
  const lastUnlock = useCaseStore((state) => state.lastUnlock);
  const dismissUnlock = useCaseStore((state) => state.dismissUnlock);
  const openWindows = useWindowStore((state) => state.openWindows);
  const minimized = useWindowStore((state) => state.minimized);
  const openWindow = useWindowStore((state) => state.openWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const started = useRef(false);
  const { cue } = useFogAudio();

  const progress = calculateProgress(completed, evidenceIds.length, anonymous);
  const credibility = credibilityLabel(completed, evidenceIds.length);
  const nextLead = useMemo(() => {
    if (!completed.includes("schedule")) return "比较四份时间记录，找回被偷走的分钟";
    if (!completed.includes("frequency")) return "前往录音带，以 0.75× 高通解析纸带";
    if (!completed.includes("photo")) return "打开监控室，拼合密封照片包";
    if (!completed.includes("deduction")) return "在证据墙闭合五段责任链";
    return "阅读最终档案，并决定真相去向";
  }, [completed]);

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
      if (event.key === "Escape") {
        const active = useWindowStore.getState().activeWindow;
        if (active) closeWindow(active);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWindow]);

  useEffect(() => {
    if (!lastUnlock) return;
    const timer = window.setTimeout(dismissUnlock, 4800);
    return () => window.clearTimeout(timer);
  }, [dismissUnlock, lastUnlock]);

  const launch = (id: WindowId) => {
    if (!isModuleUnlocked(completed, id)) {
      cue("error");
      return;
    }
    cue(id === "audio" ? "tape" : "paper");
    openWindow(id);
  };

  return (
    <main className="investigation-desktop">
      <div className="harbor-window" aria-hidden="true"><span className="rain-pane" /><span className="distant-lamp lamp-one" /><span className="distant-lamp lamp-two" /><span className="pier-silhouette" /></div>
      <div className="desk-grain" aria-hidden="true" />
      <header className="case-statusbar">
        <div><span className="status-seal">雾港港务局</span><strong>P-07-0712</strong><small>调查员 / {code}</small></div>
        <div className="case-metrics"><span>档案完整度 <strong>{progress}%</strong></span><span>证据可信度 <strong>{credibility}</strong></span><span>当前时间 <strong>02:17</strong></span><button type="button" className="sound-toggle" onClick={() => updateAudio({ muted: !audio.muted })} aria-label={audio.muted ? "开启声音" : "关闭声音"}>{audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>
      </header>

      <section className="desk-brief" aria-label="当前调查目标"><span>匿名委托 / 潮汐_0</span><p>{nextLead}</p></section>

      <section className="desk-objects" aria-label="调查桌面物件">
        {modules.map((item) => {
          const unlocked = isModuleUnlocked(completed, item.id);
          const Icon = item.icon;
          return <button type="button" key={item.id} className={`desk-object ${item.deskClass} ${unlocked ? "" : "is-locked"}`} onClick={() => launch(item.id)} aria-disabled={!unlocked} title={!unlocked ? unlockCopy[item.id] : `打开${item.label}`}><span className="object-surface"><Icon size={25} aria-hidden="true" />{!unlocked && <LockKeyhole className="object-lock" size={13} aria-hidden="true" />}</span><strong>{item.label}</strong><small>{unlocked ? item.code : unlockCopy[item.id]}</small></button>;
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
          const unlocked = isModuleUnlocked(completed, item.id);
          const isOpen = openWindows.includes(item.id) && !minimized.includes(item.id);
          return <button type="button" key={item.id} data-window-dock={item.id} className={isOpen ? "is-open" : ""} disabled={!unlocked} onClick={() => minimized.includes(item.id) ? restoreWindow(item.id) : launch(item.id)} aria-label={`${isOpen ? "切换到" : "打开"}${item.label}`}><Icon size={18} /><span>{item.label}</span></button>;
        })}
      </nav>

      <AnimatePresence>{lastUnlock && <motion.aside className="unlock-toast" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} aria-live="polite"><span>NEW ARCHIVE LINK</span><strong>{unlockMessage(lastUnlock)}</strong><button type="button" onClick={dismissUnlock}>知道了</button></motion.aside>}</AnimatePresence>
    </main>
  );
}

function unlockMessage(id: string) {
  if (id === "schedule") return "时间偏移已验证 / 录音带已恢复";
  if (id === "frequency") return "口令 0712 通过 / 监控室已恢复";
  if (id === "photo") return "船号 H-1707 已确认 / 证据墙已开放";
  if (id === "deduction") return "责任链闭合 / 最终档案已开放";
  if (id === "anonymous") return "匿名声纹确认 / 地图背面出现字迹";
  if (id === "hidden") return "第七层索引已恢复";
  return "新的证据关系已建立";
}
