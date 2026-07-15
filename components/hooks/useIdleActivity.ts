"use client";

import { useEffect, useRef } from "react";

interface UseIdleActivityOptions {
  enabled?: boolean;
  timeoutMs: number;
  onIdle: () => void;
  pointerMoveThrottleMs?: number;
}

export function useIdleActivity({
  enabled = true,
  timeoutMs,
  onIdle,
  pointerMoveThrottleMs = 500,
}: UseIdleActivityOptions) {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;

    let idleTimer: number | null = null;
    let lastPointerMoveAt = Number.NEGATIVE_INFINITY;
    const delay = Math.max(0, timeoutMs);
    const pointerThrottle = Math.max(0, pointerMoveThrottleMs);
    const passive: AddEventListenerOptions = { passive: true };

    const clearIdleTimer = () => {
      if (idleTimer === null) return;
      window.clearTimeout(idleTimer);
      idleTimer = null;
    };

    const pageIsActive = () => document.visibilityState === "visible" && document.hasFocus();

    const armIdleTimer = () => {
      clearIdleTimer();
      if (!pageIsActive()) return;
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        if (pageIsActive()) onIdleRef.current();
      }, delay);
    };

    const onActivity = () => {
      armIdleTimer();
    };

    const onPointerMove = () => {
      const now = window.performance.now();
      if (now - lastPointerMoveAt < pointerThrottle) return;
      lastPointerMoveAt = now;
      armIdleTimer();
    };

    const onPageStateChange = () => {
      if (pageIsActive()) {
        lastPointerMoveAt = Number.NEGATIVE_INFINITY;
        armIdleTimer();
      } else {
        clearIdleTimer();
      }
    };

    window.addEventListener("pointerdown", onActivity, passive);
    window.addEventListener("pointermove", onPointerMove, passive);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("wheel", onActivity, passive);
    window.addEventListener("touchmove", onActivity, passive);
    document.addEventListener("visibilitychange", onPageStateChange);
    window.addEventListener("focus", onPageStateChange);
    window.addEventListener("blur", onPageStateChange);
    armIdleTimer();

    return () => {
      clearIdleTimer();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("touchmove", onActivity);
      document.removeEventListener("visibilitychange", onPageStateChange);
      window.removeEventListener("focus", onPageStateChange);
      window.removeEventListener("blur", onPageStateChange);
    };
  }, [enabled, pointerMoveThrottleMs, timeoutMs]);
}
