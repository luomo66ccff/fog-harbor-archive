"use client";

import { create } from "zustand";
import type { WindowId, WindowNavigationIntent, WindowNavigationOptions } from "@/types/case";

interface WindowState {
  openWindows: WindowId[];
  minimized: WindowId[];
  activeWindow: WindowId | null;
  zOrder: Partial<Record<WindowId, number>>;
  positions: Partial<Record<WindowId, { x: number; y: number }>>;
  pendingIntents: Partial<Record<WindowId, WindowNavigationIntent>>;
  openWindow: (id: WindowId, options?: WindowNavigationOptions) => void;
  consumeIntent: (id: WindowId, serial: number) => void;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  restoreWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  setPosition: (id: WindowId, position: { x: number; y: number }) => void;
  closeAll: () => void;
}

let zCounter = 120;
let intentSerial = 0;

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

export const useWindowStore = create<WindowState>((set) => ({
  openWindows: [],
  minimized: [],
  activeWindow: null,
  zOrder: {},
  positions: {},
  pendingIntents: {},
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
  closeAll: () => set({ openWindows: [], minimized: [], activeWindow: null, pendingIntents: {} }),
}));
