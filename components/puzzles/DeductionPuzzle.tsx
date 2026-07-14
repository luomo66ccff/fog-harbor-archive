"use client";

import { DragEvent, useMemo, useState } from "react";
import { Check, Link2, Search, X } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import { deductionAnswer, deductionSlots, isDeductionSolved } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";

type SlotId = (typeof deductionSlots)[number];
type Token = { id: string; label: string; slot: SlotId };

const slotLabels: Record<SlotId, string> = { person: "人物", time: "时间", place: "地点", action: "行为", motive: "目的" };
const tokens: Token[] = [
  { id: "zhou-jiming", label: "周既明", slot: "person" }, { id: "gu-weian", label: "顾惟安", slot: "person" }, { id: "xu-wancheng", label: "许晚澄", slot: "person" },
  { id: "00:31", label: "00:31", slot: "time" }, { id: "00:39", label: "00:39", slot: "time" }, { id: "01:07", label: "01:07", slot: "time" },
  { id: "loc-control", label: "监控室", slot: "place" }, { id: "loc-pier7", label: "第七码头", slot: "place" }, { id: "loc-weather", label: "气象站", slot: "place" },
  { id: "clock-shift", label: "快调系统主时钟", slot: "action" }, { id: "erase-rain", label: "删除原始天气", slot: "action" }, { id: "open-gate", label: "打开七号外闸", slot: "action" },
  { id: "hide-heron", label: "掩盖白鹭七号靠泊", slot: "motive" }, { id: "fake-call", label: "伪造家属通话", slot: "motive" }, { id: "protect-lin", label: "保护林知夏离港", slot: "motive" },
];

export function DeductionPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("deduction"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [values, setValues] = useState<Partial<Record<SlotId, string>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("把同类线索拖入五个槽位，组成一条能解释全部记录的责任链。");
  const [hintIndex, setHintIndex] = useState(-1);
  const tokenById = useMemo(() => new Map(tokens.map((token) => [token.id, token])), []);

  const assign = (tokenId: string, slot: SlotId) => {
    const token = tokenById.get(tokenId);
    if (!token || token.slot !== slot) {
      setFeedback(`这个线索不属于“${slotLabels[slot]}”槽位。`);
      cue("error");
      return;
    }
    setValues((current) => ({ ...current, [slot]: tokenId }));
    setSelected(null);
    cue("paper");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, slot: SlotId) => {
    event.preventDefault();
    assign(event.dataTransfer.getData("text/deduction-token"), slot);
  };

  const validate = () => {
    recordAttempt("deduction");
    if (deductionSlots.some((slot) => !values[slot])) {
      setFeedback("责任链尚未闭合。五个槽位都必须有可核对的证据。");
      cue("error");
      return;
    }
    if (isDeductionSolved(values)) {
      completePuzzle("deduction");
      setFeedback("逻辑链闭合。最终档案、封存指令与匿名声纹比对已开放。");
      cue("unlock");
      return;
    }
    const wrong = deductionSlots.filter((slot) => values[slot] !== deductionAnswer[slot]).length;
    setFeedback(`链条中仍有 ${wrong} 处无法被原始记录同时支持。先检查“谁拥有主时钟权限”与“篡改真正保护了什么”。`);
    cue("error");
  };

  if (solved) return <section className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>责任链已闭合</strong><p>周既明 → 00:31 → 监控室 → 快调系统主时钟 → 掩盖白鹭七号靠泊。</p></div></section>;

  return (
    <section className="puzzle-panel deduction-puzzle" aria-labelledby="deduction-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 04 / EVIDENCE CHAIN</p><h3 id="deduction-title">证据关系推理</h3></div><Link2 size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">拖动或点击线索，再放入对应槽位。只有五段逻辑全部正确，最终卷宗才会解锁。</p>
      <div className="deduction-chain">
        {deductionSlots.map((slot, index) => {
          const value = values[slot];
          const token = value ? tokenById.get(value) : null;
          return <div key={slot} className="chain-wrap"><div className={`chain-slot ${token ? "is-filled" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, slot)}><button type="button" className="chain-slot-target" onClick={() => { if (selected) assign(selected, slot); }}><small>{slotLabels[slot]}</small><strong>{token?.label ?? "放入线索"}</strong></button>{token && <button type="button" className="chain-slot-clear" onClick={() => setValues((current) => ({ ...current, [slot]: undefined }))} aria-label={`清除${slotLabels[slot]}`}><X size={13} /></button>}</div>{index < deductionSlots.length - 1 && <i aria-hidden="true">→</i>}</div>;
        })}
      </div>
      <div className="token-bank" aria-label="可用推理线索">{tokens.map((token) => <button type="button" draggable key={token.id} onDragStart={(event) => event.dataTransfer.setData("text/deduction-token", token.id)} onClick={() => setSelected(token.id)} className={selected === token.id ? "is-selected" : ""} aria-pressed={selected === token.id}><small>{slotLabels[token.slot]}</small>{token.label}</button>)}</div>
      <div className="deduction-footer"><p className="puzzle-feedback" role="status">{feedback}</p><button type="button" className="primary-action" onClick={validate}>验证责任链</button></div>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.deduction.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.deduction[hintIndex]}</p>}
    </section>
  );
}
