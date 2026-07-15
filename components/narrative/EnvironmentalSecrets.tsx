"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Lightbulb, Sparkles, Waves } from "lucide-react";
import { useIdleActivity } from "@/components/hooks/useIdleActivity";
import { getLampMorseCopy } from "@/lib/easter-egg-engine";
import { useCaseStore } from "@/store/case-store";

interface EnvironmentalSecretsProps {
  frequencySolved: boolean;
  runCount: number;
}

export function EnvironmentalSecrets({ frequencySolved, runCount }: EnvironmentalSecretsProps) {
  const discovered = useCaseStore((state) => state.discoveredEasterEggs);
  const discover = useCaseStore((state) => state.discoverEasterEgg);
  const reduceMotion = useReducedMotion();
  const [message, setMessage] = useState("");
  const [knocking, setKnocking] = useState(false);
  const wipingRef = useRef(false);
  const wipeMovesRef = useRef(0);
  const knockTimerRef = useRef<number | null>(null);

  const revealRainTrace = () => {
    discover("rain-trace");
    setMessage("玻璃下显出一行旧字：‘别相信所有救你的人。’");
  };

  const onWipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    wipingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onWipeMove = () => {
    if (!wipingRef.current || discovered.includes("rain-trace")) return;
    wipeMovesRef.current += 1;
    if (wipeMovesRef.current >= 4) revealRainTrace();
  };

  const stopWiping = () => {
    wipingRef.current = false;
  };

  const secondRunKnockAvailable = runCount >= 2 && !discovered.includes("second-run-knock");

  useIdleActivity({
    enabled: secondRunKnockAvailable,
    timeoutMs: 18000,
    onIdle: () => {
      discover("second-run-knock");
      setMessage("咚。咚。咚。收件箱边缘浮出一句：‘这一次，你比上次更快。’");
      if (reduceMotion) return;
      setKnocking(true);
      if (knockTimerRef.current !== null) window.clearTimeout(knockTimerRef.current);
      knockTimerRef.current = window.setTimeout(() => {
        knockTimerRef.current = null;
        setKnocking(false);
      }, 1100);
    },
  });

  useEffect(() => () => {
    if (knockTimerRef.current !== null) {
      window.clearTimeout(knockTimerRef.current);
      knockTimerRef.current = null;
    }
  }, []);

  const lampDiscovered = discovered.includes("lamp-morse-0712");
  const rainDiscovered = discovered.includes("rain-trace");

  return (
    <>
      <div className={`environmental-secrets ${knocking ? "is-knocking" : ""}`}>
        {frequencySolved && (
          <button
            type="button"
            className={`harbor-lamp-secret ${lampDiscovered ? "is-discovered" : ""} ${reduceMotion ? "is-static" : ""}`}
            onClick={() => {
              discover("lamp-morse-0712");
              setMessage(getLampMorseCopy(runCount));
            }}
            aria-label="观察远处港灯的闪烁节奏"
            data-easter-egg="lamp-morse-0712"
          >
            <Lightbulb size={15} aria-hidden="true" /><span>{lampDiscovered ? "0712" : "远处港灯"}</span>
          </button>
        )}

        <div
          className={`rain-trace-secret ${rainDiscovered ? "is-discovered" : ""}`}
          onPointerDown={onWipeStart}
          onPointerMove={onWipeMove}
          onPointerUp={stopWiping}
          onPointerCancel={stopWiping}
          data-easter-egg="rain-trace"
        >
          <Waves size={16} aria-hidden="true" />
          <span>{rainDiscovered ? "别相信所有救你的人。" : "玻璃上有一小块雾层"}</span>
          <button type="button" onClick={revealRainTrace}>{rainDiscovered ? "字迹已显现" : "擦拭玻璃"}</button>
        </div>
      </div>
      {message && <div className="environmental-secret-message" role="status"><Sparkles size={14} aria-hidden="true" /><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="关闭彩蛋提示">×</button></div>}
    </>
  );
}
