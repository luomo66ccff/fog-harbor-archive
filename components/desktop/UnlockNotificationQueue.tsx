"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { getUnlockNotification } from "@/lib/progression-engine";
import { useCaseStore } from "@/store/case-store";
import { useWindowStore } from "@/store/window-store";

export function UnlockNotificationQueue() {
  const queue = useCaseStore((state) => state.unlockQueue);
  const dismiss = useCaseStore((state) => state.dismissUnlockNotification);
  const openWindow = useWindowStore((state) => state.openWindow);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const focusNextRef = useRef(false);
  const current = queue[0];
  const notification = current ? getUnlockNotification(current) : null;

  useEffect(() => {
    if (!current || !focusNextRef.current) return;
    focusNextRef.current = false;
    const frame = window.requestAnimationFrame(() => openButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [current]);

  const openNow = () => {
    if (!current || !notification) return;
    const { windowId, tab, focusId } = notification.target;
    if (tab || focusId) openWindow(windowId, { tab, focusId });
    else openWindow(windowId);
    dismiss(current);
  };

  const handleLater = () => {
    if (!current) return;
    focusNextRef.current = queue.length > 1;
    dismiss(current);
  };

  return (
    <section
      className="unlock-notification-region"
      aria-label="案件解锁通知"
      aria-live="polite"
      aria-atomic="true"
    >
      {current && notification && (
        <aside className="unlock-notification" data-unlock-event={current}>
          <span className="unlock-notification-kicker">NEW ARCHIVE LINK</span>
          <strong>{notification.title}</strong>
          <p>{notification.content}</p>
          <small>{notification.reason}</small>
          <div className="unlock-notification-actions">
            <button ref={openButtonRef} type="button" onClick={openNow}>
              立即打开 <ArrowUpRight size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={handleLater}>
              <Clock3 size={14} aria-hidden="true" /> 稍后处理
            </button>
          </div>
          {queue.length > 1 && <span className="unlock-notification-count">队列中还有 {queue.length - 1} 条</span>}
        </aside>
      )}
    </section>
  );
}
