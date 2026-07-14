"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowRight, LockKeyhole, X } from "lucide-react";
import type { LockedModuleAccess } from "@/lib/progression-engine";
import type { WindowNavigationTarget } from "@/types/case";

export interface LockedModuleDialogProps {
  access: LockedModuleAccess | null;
  onClose: () => void;
  onNavigate: (target: WindowNavigationTarget) => void;
}

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function LockedModuleDialog({ access, onClose, onNavigate }: LockedModuleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const navigatedRef = useRef(false);
  const dialogKey = access?.requiredPuzzle ?? null;

  useEffect(() => {
    if (!dialogKey) return;
    navigatedRef.current = false;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => primaryRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (!navigatedRef.current) previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [dialogKey]);

  if (!access) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const navigate = () => {
    navigatedRef.current = true;
    onNavigate(access.nextTarget);
    onClose();
  };

  return (
    <div
      className="locked-module-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="locked-module-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-module-title"
        aria-describedby="locked-module-description"
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="locked-module-close" onClick={onClose} aria-label="关闭锁定说明">
          <X size={17} aria-hidden="true" />
        </button>
        <span className="locked-module-icon" aria-hidden="true"><LockKeyhole size={24} /></span>
        <p className="locked-module-kicker">ACCESS RESTRICTED</p>
        <h2 id="locked-module-title">{access.title}</h2>
        <p id="locked-module-description">{access.reason}</p>
        <p className="locked-module-missing"><span>缺少</span><strong>{access.missing}</strong></p>
        <div className="locked-module-actions">
          <button ref={primaryRef} type="button" className="primary-action" onClick={navigate}>
            前往当前线索 <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
