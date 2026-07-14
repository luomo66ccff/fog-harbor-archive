"use client";

import { useMemo, useState } from "react";
import { Eye, MailOpen, MapPin, ShieldQuestion } from "lucide-react";
import { HiddenPuzzle } from "@/components/puzzles/HiddenPuzzle";
import { WindowFrame } from "@/components/windows/WindowFrame";
import { locations, messages, people, timeline } from "@/lib/case-data";
import { useCaseStore } from "@/store/case-store";

export function PeopleWindow() {
  const completed = useCaseStore((state) => state.completedPuzzles);
  const [selectedId, setSelectedId] = useState(people[0].id);
  const selected = people.find((person) => person.id === selectedId) ?? people[0];
  const reveal = completed.includes("deduction");
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
  const [selectedId, setSelectedId] = useState("loc-pier7");
  const selected = locations.find((location) => location.id === selectedId) ?? locations[0];
  return (
    <WindowFrame id="map" title="港区地图" index="M-07" className="medium-window">
      <div className="map-layout">
        <div className="harbor-map">
          <span className="map-watermark">雾港 / 旧版 2019</span><span className="coast-line coast-a" /><span className="coast-line coast-b" /><span className="shipping-lane lane-a" /><span className="shipping-lane lane-b" />
          {locations.map((location) => <button type="button" key={location.id} className={selected.id === location.id ? "is-selected" : ""} style={{ left: `${location.x}%`, top: `${location.y}%` }} onClick={() => setSelectedId(location.id)} aria-label={`查看地点：${location.name}`}><MapPin size={15} /><span>{location.name}</span></button>)}
        </div>
        <aside className="map-note"><p className="eyebrow">LOCATION / {selected.kind}</p><h3>{selected.name}</h3><p>{selected.description}</p><div>{selected.linkedEvidence.map((id) => <span key={id}>{id.replace("ev-", "E/")}</span>)}</div></aside>
      </div>
      {completed.includes("deduction") && anonymous && <HiddenPuzzle />}
      {completed.includes("deduction") && !anonymous && <div className="locked-inline"><ShieldQuestion size={17} /><span>地图背面有潮湿压痕，但系统要求先确认匿名委托人的身份。</span></div>}
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
  const code = useCaseStore((state) => state.investigatorCode);
  const readIds = useCaseStore((state) => state.readMessageIds);
  const markRead = useCaseStore((state) => state.markMessageRead);
  const available = useMemo(() => messages.filter((message) => !message.unlockAfter || completed.includes(message.unlockAfter)), [completed]);
  const [selectedId, setSelectedId] = useState("msg-commission");
  const selected = available.find((message) => message.id === selectedId) ?? available[0];
  const open = (id: string) => { setSelectedId(id); markRead(id); };
  return (
    <WindowFrame id="inbox" title="离线收件箱" index={`I-${available.length.toString().padStart(2, "0")}`} className="medium-window">
      <div className="inbox-layout"><aside className="message-list"><header><strong>本地消息</strong><span>{available.filter((item) => !readIds.includes(item.id)).length} 未读</span></header>{available.map((message) => <button type="button" key={message.id} className={`${selected?.id === message.id ? "is-selected" : ""} ${readIds.includes(message.id) ? "is-read" : ""}`} onClick={() => open(message.id)}><MailOpen size={15} /><span><strong>{message.from}</strong><small>{message.subject}</small></span><time>{message.time}</time></button>)}</aside>{selected && <article className="message-reader"><p className="eyebrow">OFFLINE MESSAGE / {selected.time}</p><h2>{selected.subject}</h2><p className="message-from">来自：{selected.from}　→　调查员 {code}</p>{selected.body.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{{code}}", code)}</p>)}<footer>此消息保存在本地备份节点，来源不可验证。</footer></article>}</div>
    </WindowFrame>
  );
}

