"use client";

import { create } from "zustand";
import { nextArchiveAcrosticTrail } from "@/lib/easter-egg-engine";
import type { WindowId, WindowNavigationIntent, WindowNavigationOptions } from "@/types/case";

const EASTER_EGG_SESSION_KEY = "fog-harbor-easter-session-v1";

interface EasterEggSessionState {
  archiveStampClicks: number;
  archiveAcrosticTrail: string[];
}

interface WindowState {
  openWindows: WindowId[];
  minimized: WindowId[];
  activeWindow: WindowId | null;
  zOrder: Partial<Record<WindowId, number>>;
  positions: Partial<Record<WindowId, { x: number; y: number }>>;
  pendingIntents: Partial<Record<WindowId, WindowNavigationIntent>>;
  archiveStampClicks: number;
  archiveAcrosticTrail: string[];
  openWindow: (id: WindowId, options?: WindowNavigationOptions) => void;
  consumeIntent: (id: WindowId, serial: number) => void;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  restoreWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  setPosition: (id: WindowId, position: { x: number; y: number }) => void;
  pressArchiveStamp: () => number;
  recordArchiveDocumentVisit: (documentId: string) => string[];
  resetEasterEggSession: () => void;
  closeAll: () => void;
}

let zCounter = 120;
let intentSerial = 0;

function readEasterEggSession(): EasterEggSessionState {
  const fallback = { archiveStampClicks: 0, archiveAcrosticTrail: [] };
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(EASTER_EGG_SESSION_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const value = parsed as Partial<EasterEggSessionState>;
    const archiveStampClicks = typeof value.archiveStampClicks === "number"
      ? Math.min(7, Math.max(0, Math.floor(value.archiveStampClicks)))
      : 0;
    const archiveAcrosticTrail = Array.isArray(value.archiveAcrosticTrail)
      ? value.archiveAcrosticTrail
        .filter((item): item is string => typeof item === "string")
        .slice(0, 4)
      : [];
    const normalizedTrail = archiveAcrosticTrail.every((id, index) => (
      nextArchiveAcrosticTrail(archiveAcrosticTrail.slice(0, index), id).length === index + 1
    )) ? archiveAcrosticTrail : [];
    return { archiveStampClicks, archiveAcrosticTrail: normalizedTrail };
  } catch {
    return fallback;
  }
}

function writeEasterEggSession(value: EasterEggSessionState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(EASTER_EGG_SESSION_KEY, JSON.stringify(value));
  } catch {
    // Session storage can be blocked; the in-memory interaction remains playable.
  }
}

function withoutIntent(
  intents: Partial<Record<WindowId, WindowNavigationIntent>>,
  id: WindowId,
) {
  if (!intents[id]) return intents;
  const next = { ...intents };
  delete next[id];
  return next;
}

function topVisibleWindow(
  openWindows: WindowId[],
  minimized: WindowId[],
  zOrder: Partial<Record<WindowId, number>>,
) {
  return openWindows
    .filter((id) => !minimized.includes(id))
    .sort((left, right) => (zOrder[right] ?? 0) - (zOrder[left] ?? 0))[0] ?? null;
}

const initialEasterEggSession = readEasterEggSession();

export const useWindowStore = create<WindowState>((set, get) => ({
  openWindows: [],
  minimized: [],
  activeWindow: null,
  zOrder: {},
  positions: {},
  pendingIntents: {},
  ...initialEasterEggSession,
  openWindow: (id, options) => set((state) => {
    zCounter += 1;
    let pendingIntents = state.pendingIntents;
    if (options) {
      intentSerial += 1;
      pendingIntents = {
        ...pendingIntents,
        [id]: {
          ...options,
          serial: intentSerial,
        },
      };
    }
    return {
      openWindows: state.openWindows.includes(id) ? state.openWindows : [...state.openWindows, id],
      minimized: state.minimized.filter((item) => item !== id),
      activeWindow: id,
      zOrder: { ...state.zOrder, [id]: zCounter },
      pendingIntents,
    };
  }),
  consumeIntent: (id, serial) => set((state) => {
    if (state.pendingIntents[id]?.serial !== serial) return state;
    return { pendingIntents: withoutIntent(state.pendingIntents, id) };
  }),
  closeWindow: (id) => set((state) => {
    const next = state.openWindows.filter((item) => item !== id);
    const nextMinimized = state.minimized.filter((item) => item !== id);
    return {
      openWindows: next,
      minimized: nextMinimized,
      activeWindow: state.activeWindow === id
        ? topVisibleWindow(next, nextMinimized, state.zOrder)
        : state.activeWindow,
      pendingIntents: withoutIntent(state.pendingIntents, id),
    };
  }),
  minimizeWindow: (id) => set((state) => {
    const minimized = state.minimized.includes(id) ? state.minimized : [...state.minimized, id];
    return {
      minimized,
      activeWindow: state.activeWindow === id
        ? topVisibleWindow(state.openWindows, minimized, state.zOrder)
        : state.activeWindow,
    };
  }),
  restoreWindow: (id) => set((state) => {
    zCounter += 1;
    return {
      openWindows: state.openWindows.includes(id) ? state.openWindows : [...state.openWindows, id],
      minimized: state.minimized.filter((item) => item !== id),
      activeWindow: id,
      zOrder: { ...state.zOrder, [id]: zCounter },
    };
  }),
  focusWindow: (id) => set((state) => {
    zCounter += 1;
    return { activeWindow: id, zOrder: { ...state.zOrder, [id]: zCounter } };
  }),
  setPosition: (id, position) => set((state) => ({ positions: { ...state.positions, [id]: position } })),
  pressArchiveStamp: () => {
    const next = Math.min(7, get().archiveStampClicks + 1);
    const session = { archiveStampClicks: next, archiveAcrosticTrail: get().archiveAcrosticTrail };
    writeEasterEggSession(session);
    set({ archiveStampClicks: next });
    return next;
  },
  recordArchiveDocumentVisit: (documentId) => {
    const next = nextArchiveAcrosticTrail(get().archiveAcrosticTrail, documentId);
    const session = { archiveStampClicks: get().archiveStampClicks, archiveAcrosticTrail: next };
    writeEasterEggSession(session);
    set({ archiveAcrosticTrail: next });
    return next;
  },
  resetEasterEggSession: () => {
    const next = { archiveStampClicks: 0, archiveAcrosticTrail: [] };
    writeEasterEggSession(next);
    set(next);
  },
  closeAll: () => set({ openWindows: [], minimized: [], activeWindow: null, pendingIntents: {} }),
}));
