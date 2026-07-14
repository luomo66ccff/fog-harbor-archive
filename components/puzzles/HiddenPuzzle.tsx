"use client";

import { FormEvent, useState } from "react";
import { Check, FlipHorizontal2, Search } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import { HIDDEN_ANSWER } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";

export function HiddenPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("hidden"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [mirrored, setMirrored] = useState(true);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    recordAttempt("hidden");
    if (answer.trim().toUpperCase() === HIDDEN_ANSWER) {
      completePuzzle("hidden");
      setFeedback("第七层索引已解密。七港潮位镜像图写入证据 E-21。");
      cue("unlock");
    } else {
      setFeedback("口令方向不正确。地图背面的字符需要先沿垂直轴翻转。");
      cue("error");
    }
  };

  if (solved) return <section className="puzzle-success hidden-success"><Check size={20} /><div><strong>隐藏索引已打开</strong><p>雾港只是栖潮计划的七处节点之一，“档案第七码头”结局条件已满足。</p></div></section>;

  return (
    <section className="hidden-puzzle" aria-labelledby="hidden-title"><p className="eyebrow">UNLISTED / MAP REVERSE</p><h3 id="hidden-title">地图背面的镜像字迹</h3><p>只有识破委托人后，这张贴在地图背面的湿纸条才会显影。</p>
      <button type="button" className={`mirror-slip ${mirrored ? "is-mirrored" : ""}`} onClick={() => setMirrored((value) => !value)} aria-label="翻转镜像纸条"><strong>TIDE7</strong><span><FlipHorizontal2 size={14} /> {mirrored ? "沿玻璃翻转" : "恢复背面"}</span></button>
      <form onSubmit={submit}><label htmlFor="hidden-answer">输入翻转后的五位口令</label><div className="answer-row"><input id="hidden-answer" value={answer} onChange={(event) => setAnswer(event.target.value.toUpperCase().slice(0, 5))} placeholder="_____" /><button className="primary-action" type="submit">打开第七层</button></div>{feedback && <p className="puzzle-feedback" role="alert">{feedback}</p>}</form>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.hidden.length - 1))}><Search size={14} /> 请求渐进提示</button>{hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.hidden[hintIndex]}</p>}
    </section>
  );
}

