"use client";

import { useId } from "react";
import { Check, RefreshCcw, SearchCheck } from "lucide-react";
import { useCaseStore } from "@/store/case-store";
import type { SecondFigureTheory } from "@/types/narrative";

const theoryCopy: Record<SecondFigureTheory, { label: string; detail: string }> = {
  pursuer: { label: "第二道人影是追捕者", detail: "靠近落水点的姿态像是在截断逃生路线。" },
  rescuer: { label: "第二道人影是救援者", detail: "位置更接近检修梯，可能正在把人拉离水面。" },
  unknown: { label: "现有画面无法判断", detail: "照片只证明第三方在场，动机仍需工具箱与声纹交叉验证。" },
};

interface ProvisionalTheoryProps {
  correction?: boolean;
  compact?: boolean;
  onSubmitted?: () => void;
}

export function ProvisionalTheory({ correction = false, compact = false, onSubmitted }: ProvisionalTheoryProps) {
  const headingId = useId();
  const theory = useCaseStore((state) => state.provisionalTheory.secondFigure);
  const history = useCaseStore((state) => state.theoryHistory);
  const setTheory = useCaseStore((state) => state.setSecondFigureTheory);
  const hasCorrection = history.some((entry) => entry.includes("->"));

  const choose = (value: SecondFigureTheory) => {
    setTheory(value);
    onSubmitted?.();
  };

  if (correction && !theory) return null;

  if (correction && hasCorrection) {
    return (
      <section className={`provisional-theory is-corrected ${compact ? "is-compact" : ""}`}>
        <RefreshCcw size={18} aria-hidden="true" />
        <div><strong>推理已被新证据修正</strong><p>你没有删掉旧判断。系统保留了它，因为推翻自己的结论也是调查的一部分。</p></div>
      </section>
    );
  }

  if (correction && theory === "rescuer") {
    return (
      <section className={`provisional-theory is-confirmed ${compact ? "is-compact" : ""}`}>
        <Check size={18} aria-hidden="true" />
        <div><strong>临时判断得到确认</strong><p>工具箱位置、检修梯与声纹证据都更支持“救援者”。这不洗清陈牧隐瞒事实的责任。</p></div>
      </section>
    );
  }

  if (!correction && theory) {
    return (
      <section className={`provisional-theory is-recorded ${compact ? "is-compact" : ""}`}>
        <Check size={18} aria-hidden="true" />
        <div><strong>临时判断已记录：{theoryCopy[theory].label}</strong><p>{theoryCopy[theory].detail} 后续工具箱或声纹证据可以要求你修正它。</p></div>
      </section>
    );
  }

  const options: SecondFigureTheory[] = correction
    ? ["rescuer", "unknown"]
    : ["pursuer", "rescuer", "unknown"];

  return (
    <section className={`provisional-theory ${correction ? "is-correction" : ""} ${compact ? "is-compact" : ""}`} aria-labelledby={headingId}>
      <header>
        {correction ? <RefreshCcw size={19} aria-hidden="true" /> : <SearchCheck size={19} aria-hidden="true" />}
        <div>
          <p className="eyebrow">{correction ? "NEW EVIDENCE / REVISE" : "PROVISIONAL THEORY / NON-BINDING"}</p>
          <h3 id={headingId}>{correction ? "修正先前判断" : "照片中的第二道人影是谁？"}</h3>
        </div>
      </header>
      {correction && theory && <p className="provisional-theory__previous">先前判断：{theoryCopy[theory].label}</p>}
      <p>{correction ? "陈牧的工具箱、检修梯位置与匿名声纹给出了新的解释。你可以修正，也可以暂时保留疑问。" : "这项判断只记录你的当前推理，不改变主线、证据奖励或任何结局条件。"}</p>
      <div className="provisional-theory__options">
        {options.map((value) => (
          <button
            type="button"
            key={value}
            className={theory === value ? "is-selected" : ""}
            aria-pressed={theory === value}
            disabled={correction && theory === value}
            onClick={() => choose(value)}
          >
            <strong>{theoryCopy[value].label}</strong>
            <small>{theoryCopy[value].detail}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
