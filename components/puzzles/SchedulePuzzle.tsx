"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, FileClock, Search } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import { SCHEDULE_ANSWER } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";

const records = [
  { id: "duty", source: "值班签到表", time: "00:42", detail: "周既明进入监控室（手写补录）", anchor: "校时事件" },
  { id: "port", source: "船只进港记录", time: "00:20 / 01:07", detail: "外闸磁感器原始时间，没有系统校时字段", anchor: "物理传感器" },
  { id: "weather", source: "自动气象站日志", time: "00:31", detail: "岸钟反光校准帧；电子叠字显示 00:42", anchor: "同一帧双时钟" },
  { id: "phone", source: "通话录音头", time: "00:39 / 屏显 00:50", detail: "通信节点原始时间与港务终端屏显", anchor: "同一通话双时间" },
];

export function SchedulePuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("schedule"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);
  const ready = reviewed.length === records.length;
  const selected = useMemo(() => new Set(reviewed), [reviewed]);

  const inspect = (id: string) => {
    setReviewed((items) => items.includes(id) ? items : [...items, id]);
    cue("paper");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    recordAttempt("schedule");
    if (!ready) {
      setFeedback("还有来源没有展开。单独一张表只能证明有人写过字，不能证明时间是真的。");
      cue("error");
      return;
    }
    if (answer.trim() === SCHEDULE_ANSWER) {
      completePuzzle("schedule");
      setFeedback("校准通过：港务系统时间被整体快调。录音带与监控室权限已恢复。");
      cue("unlock");
      return;
    }
    const numeric = Number(answer);
    if (!answer.trim() || Number.isNaN(numeric)) setFeedback("系统只接受分钟数。请从两组‘同一事件、双时间’中计算差值。");
    else if (numeric < 6) setFeedback("差值太小，不足以同时解释校准帧与通话屏显。");
    else if (numeric > 20) setFeedback("这更像整段换班，不像一次主时钟校准。再对齐相同事件。");
    else setFeedback("这个差值只能对齐一组记录，另一组仍然错位。");
    cue("error");
  };

  if (solved) {
    return <section className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>时间链已校准</strong><p>原始岸钟 00:31，对应被修改后的系统时间 00:42。偏移已写入证据 E-07。</p></div></section>;
  }

  return (
    <section className="puzzle-panel schedule-puzzle" aria-labelledby="schedule-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 01 / TIME TABLE</p><h3 id="schedule-title">被篡改的值班时间表</h3></div><FileClock size={24} aria-hidden="true" /></div>
      <p className="puzzle-brief">展开四个来源，找出在相同事件上重复出现的时间偏移。答案以分钟为单位。</p>
      <div className="record-comparison">
        {records.map((record) => (
          <button type="button" key={record.id} className={`record-slip ${selected.has(record.id) ? "is-reviewed" : ""}`} onClick={() => inspect(record.id)} aria-pressed={selected.has(record.id)}>
            <span>{record.source}</span><strong>{record.time}</strong><small>{selected.has(record.id) ? record.detail : "点击展开复印件"}</small><em>{record.anchor}</em>
          </button>
        ))}
      </div>
      <form className="puzzle-form" onSubmit={submit}>
        <label htmlFor="schedule-answer">系统时钟被改动了多少分钟？</label>
        <div className="answer-row"><input id="schedule-answer" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))} placeholder="__" aria-describedby="schedule-feedback" /><span>分钟</span><button type="submit" className="primary-action">校准时间</button></div>
        {feedback && <p id="schedule-feedback" className="puzzle-feedback" role="alert">{feedback}</p>}
      </form>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.schedule.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.schedule[hintIndex]}</p>}
    </section>
  );
}

