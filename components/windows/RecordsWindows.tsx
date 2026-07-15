"use client";

import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import { Eye, FlipHorizontal2, LockKeyhole, MailOpen, MapPin, Minus, Plus, RotateCcw, ShieldQuestion } from "lucide-react";
import { HiddenPuzzle } from "@/components/puzzles/HiddenPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { locations, messages, people, timeline } from "@/lib/case-data";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";
import type { LocationRecord, PuzzleId } from "@/types/case";

interface MapHotspot extends LocationRecord {
  unlockAfter?: PuzzleId;
}

const mapHotspots: MapHotspot[] = [
  ...locations,
  { id: "loc-passage", name: "外侧通道", kind: "封锁区域", x: 63, y: 69, description: "第七码头外侧的狭窄步道。照片显示 00:43 前后这里曾出现争执。", linkedEvidence: ["ev-photo", "ev-draft"], unlockAfter: "photo" },
  { id: "loc-ladder", name: "检修梯", kind: "下层通道", x: 75, y: 78, description: "通往水线下方的维修梯。第二道人影与陈牧的工具箱都在附近被确认。", linkedEvidence: ["ev-toolbox", "ev-cctv"], unlockAfter: "photo" },
];

const mapZoomLevels = [1, 1.35, 1.7] as const;

function currentTaskLocation(completed: readonly PuzzleId[]) {
  if (!completed.includes("schedule")) return "loc-control";
  if (!completed.includes("frequency")) return "loc-archive";
  if (!completed.includes("photo")) return "loc-pier7";
  if (!completed.includes("deduction")) return "loc-control";
  return "loc-archive";
}

export function PeopleWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const intent = useWindowStore((state) => state.pendingIntents.people);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const [selectedId, setSelectedId] = useState(people[0].id);
  const selected = people.find((person) => person.id === selectedId) ?? people[0];
  const reveal = completed.includes("deduction");
  useEffect(() => {
    if (!intent) return;
    const frame = window.requestAnimationFrame(() => {
      if (intent.focusId && people.some((person) => person.id === intent.focusId)) setSelectedId(intent.focusId);
      consumeIntent("people", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [consumeIntent, intent]);
  return (
    <WindowFrame id="people" title="人物关系" index="P-06" className="medium-window">
      <div className="people-layout">
        <div className="person-index">{people.map((person, index) => <button type="button" key={person.id} className={selected.id === person.id ? "is-selected" : ""} onClick={() => setSelectedId(person.id)}><span className={`id-silhouette silhouette-${index % 4}`} aria-hidden="true" /><strong>{person.name}</strong><small>{person.role}</small></button>)}</div>
        <article className="person-dossier"><div className="dossier-photo"><span className="profile-shadow" /><em>{selected.ageAtIncident || "—"} / 案发时</em></div><p className="eyebrow">PERSON / {selected.id.toUpperCase()}</p><h2>{selected.name}</h2><dl><div><dt>身份</dt><dd>{selected.role}</dd></div><div><dt>状态</dt><dd>{selected.status}</dd></div></dl><p>{selected.summary}</p><blockquote>{selected.statement}</blockquote><div className="evidence-tags">{selected.linkedEvidence.map((id) => <span key={id}>{id.replace("ev-", "E/")}</span>)}</div>{reveal && selected.secret && <aside className="dossier-secret"><Eye size={14} /> 重建信息：{selected.secret}</aside>}</article>
      </div>
    </WindowFrame>
  );
}

export function MapWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const anonymous = useCaseStore((state) => state.discoveredAnonymous);
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const discoverEasterEgg = useCaseStore((state) => state.discoverEasterEgg);
  const intent = useWindowStore((state) => state.pendingIntents.map);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const [selectedId, setSelectedId] = useState("loc-pier7");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [mirrorFocusHintSeen, setMirrorFocusHintSeen] = useState(false);
  const hiddenIndexRef = useRef<HTMLDivElement>(null);
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mirrorFocusHintId = useId();
  const selected = mapHotspots.find((location) => location.id === selectedId) ?? mapHotspots[0];
  const selectedUnlocked = !selected.unlockAfter || completed.includes(selected.unlockAfter);
  const taskLocation = currentTaskLocation(completed);
  const zoom = mapZoomLevels[zoomIndex];

  useEffect(() => {
    if (!intent) return;
    const focusId = intent.focusId;
    const frame = window.requestAnimationFrame(() => {
      if (focusId === "hidden-index") {
        hiddenIndexRef.current?.scrollIntoView({ block: "nearest" });
      } else if (focusId && mapHotspots.some((location) => location.id === focusId)) {
        setSelectedId(focusId);
        window.requestAnimationFrame(() => hotspotRefs.current[focusId]?.focus());
      }
      consumeIntent("map", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [consumeIntent, intent]);

  const mapStyle: CSSProperties = {
    backgroundImage: `url(${visualAssets.map})`,
    width: `${zoom * 100}%`,
  };
  const mirrorDiscovered = discoveredEasterEggs.includes("mirror-map");
  const mirrorActionLabel = mirrorDiscovered
    ? mirrored ? "恢复正向地图" : "再次翻转地图"
    : "异常镜像符号";

  const toggleMirror = () => {
    setMirrored((value) => !value);
    if (!mirrorDiscovered) discoverEasterEgg("mirror-map");
  };

  return (
    <WindowFrame id="map" title="港区地图" index="M-07" className="medium-window">
      <div className="map-toolbar" aria-label="地图缩放控制"><button type="button" onClick={() => setZoomIndex((value) => Math.max(0, value - 1))} disabled={zoomIndex === 0} aria-label="缩小港区地图"><Minus size={16} /></button><output aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" onClick={() => setZoomIndex((value) => Math.min(mapZoomLevels.length - 1, value + 1))} disabled={zoomIndex === mapZoomLevels.length - 1} aria-label="放大港区地图"><Plus size={16} /></button><button type="button" onClick={() => setZoomIndex(0)} disabled={zoomIndex === 0}><RotateCcw size={15} /> 重置</button></div>
      <div className="map-layout material-map-layout">
        <div className="map-viewport">
          <div className={`harbor-map material-harbor-map ${mirrored ? "is-mirrored" : ""}`} style={mapStyle}>
          <span className="map-watermark">雾港港务局 / 2019 港区调查图</span>
          {mapHotspots.map((location) => {
            const unlocked = !location.unlockAfter || completed.includes(location.unlockAfter);
            const isTask = taskLocation === location.id;
            return <button ref={(node) => { hotspotRefs.current[location.id] = node; }} type="button" key={location.id} className={`${selected.id === location.id ? "is-selected" : ""} ${unlocked ? "is-unlocked" : "is-locked"} ${isTask ? "is-current-task" : ""}`} style={{ left: `${location.x}%`, top: `${location.y}%` }} onClick={() => setSelectedId(location.id)} aria-label={`${unlocked ? "查看地点" : "查看未恢复地点轮廓"}：${location.name}`} data-locked={!unlocked || undefined}><MapPin size={17} /><span>{location.name}</span>{!unlocked && <LockKeyhole size={12} className="map-hotspot-lock" aria-hidden="true" />}</button>;
          })}
          <div className="map-truth-legend" aria-hidden="true"><span>当前目标</span><span>已确认地点</span><span>待恢复索引</span></div>
          {anonymous && (
            <div
              className={`map-mirror-index ${mirrored ? "is-visible" : ""} ${mirrorDiscovered ? "is-discovered" : "is-undiscovered"}`}
              data-easter-egg="mirror-map"
              data-discovered={mirrorDiscovered || undefined}
            >
              <button
                type="button"
                onClick={toggleMirror}
                onFocus={() => {
                  if (!mirrorDiscovered) setMirrorFocusHintSeen(true);
                }}
                aria-label={mirrorActionLabel}
                aria-describedby={!mirrorDiscovered && mirrorFocusHintSeen ? mirrorFocusHintId : undefined}
                aria-pressed={mirrored}
              >
                <FlipHorizontal2 size={15} aria-hidden="true" />
                {mirrorDiscovered && <span>{mirrorActionLabel}</span>}
              </button>
              {!mirrorDiscovered && mirrorFocusHintSeen && (
                <p id={mirrorFocusHintId} className="map-mirror-focus-hint" role="status">
                  印刷方向似乎与其他图例相反。
                </p>
              )}
              {mirrored && <div><span>COAST-02 / ██-14</span><span>COAST-03 / █7-██</span><span>COAST-04 / 2█-09</span><span>COAST-05 / ██-31</span><span>COAST-06 / 0█-██</span><span>COAST-07 / ██-12</span><p>六个沿岸节点仅保留模糊编号；真实地名已被销毁。</p></div>}
              {mirrorDiscovered && !mirrored && <small>异常编号已记录，可再次翻转查看。</small>}
            </div>
          )}
          </div>
        </div>
        <aside className={`map-note material-map-note ${selectedUnlocked ? "" : "is-locked"}`}><p className="eyebrow">LOCATION / {selected.kind}</p><h3>{selected.name}</h3>{selectedUnlocked ? <><p>{selected.description}</p><div>{selected.linkedEvidence.map((id) => <span key={id}>{id.replace("ev-", "E/")}</span>)}</div></> : <p>照片索引尚未恢复。目前只能确认这里存在一条被封锁的港务通道。</p>}{taskLocation === selected.id && <strong className="map-task-badge">当前调查目标</strong>}</aside>
      </div>
      <div id="hidden-index" ref={hiddenIndexRef} tabIndex={-1}>{completed.includes("deduction") && anonymous && <HiddenPuzzle />}{completed.includes("deduction") && !anonymous && <div className="locked-inline"><ShieldQuestion size={17} /><span>地图背面有潮湿压痕，但系统要求先确认匿名委托人的身份。</span></div>}</div>
    </WindowFrame>
  );
}

export function TimelineWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const entries = useMemo(() => timeline.filter((entry) => !entry.unlockAfter || completed.includes(entry.unlockAfter)), [completed]);
  return (
    <WindowFrame id="timeline" title="重建时间线" index="T-11" className="medium-window"><div className="timeline-header"><span>2019.07.12</span><strong>无雨 / 轻雾 / 能见度 1.8km</strong></div><ol className="case-timeline">{entries.map((entry) => <li key={entry.id} className={entry.suspicious ? "is-suspicious" : ""}><time>{entry.time}</time><i aria-hidden="true" /><div><strong>{entry.title}</strong>{entry.correctedTime && <span>{entry.correctedTime}</span>}<p>{entry.detail}</p></div></li>)}</ol></WindowFrame>
  );
}

export function InboxWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const discoveredEasterEggs = useCaseStore((state) => state.discoveredEasterEggs);
  const code = useCaseStore((state) => state.investigatorCode);
  const readIds = useCaseStore((state) => state.readMessageIds);
  const markRead = useCaseStore((state) => state.markMessageRead);
  const intent = useWindowStore((state) => state.pendingIntents.inbox);
  const consumeIntent = useWindowStore((state) => state.consumeIntent);
  const available = useMemo(() => messages.filter((message) => {
    if (message.id === "msg-second-run" && !discoveredEasterEggs.includes("second-run-knock")) return false;
    return !message.unlockAfter || completed.includes(message.unlockAfter);
  }), [completed, discoveredEasterEggs]);
  const [initialIntent] = useState(() => useWindowStore.getState().pendingIntents.inbox);
  const [selectedId, setSelectedId] = useState(() => available.some((message) => message.id === initialIntent?.focusId) ? initialIntent!.focusId! : "msg-commission");
  const selected = available.find((message) => message.id === selectedId) ?? available[0];
  const open = (id: string) => { setSelectedId(id); markRead(id); };
  useEffect(() => {
    if (selected) markRead(selected.id);
  }, [markRead, selected]);
  useEffect(() => {
    if (!intent) return;
    const frame = window.requestAnimationFrame(() => {
      if (intent.focusId && available.some((message) => message.id === intent.focusId)) setSelectedId(intent.focusId);
      consumeIntent("inbox", intent.serial);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [available, consumeIntent, intent]);
  return (
    <WindowFrame id="inbox" title="离线收件箱" index={`I-${available.length.toString().padStart(2, "0")}`} className="medium-window">
      <div className="inbox-layout"><aside className="message-list"><header><strong>本地消息</strong><span>{available.filter((item) => !readIds.includes(item.id)).length} 未读</span></header>{available.map((message) => <button type="button" key={message.id} className={`${selected?.id === message.id ? "is-selected" : ""} ${readIds.includes(message.id) ? "is-read" : ""}`} onClick={() => open(message.id)}><MailOpen size={15} /><span><strong>{message.from}</strong><small>{message.subject}</small></span><time>{message.time}</time></button>)}</aside>{selected && <article className="message-reader"><p className="eyebrow">OFFLINE MESSAGE / {selected.time}</p><h2>{selected.subject}</h2><p className="message-from">来自：{selected.from}　→　调查员 {code}</p>{selected.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}<footer>此消息保存在本地备份节点，来源不可验证。</footer></article>}</div>
    </WindowFrame>
  );
}
