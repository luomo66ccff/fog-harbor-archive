"use client";

import { create } from "zustand";
import type { WindowId } from "@/types/case";

interface WindowState {
  openWindows: WindowId[];
  minimized: WindowId[];
  activeWindow: WindowId | null;
  zOrder: Partial<Record<WindowId, number>>;
  positions: Partial<Record<WindowId, { x: number; y: number }>>;
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  restoreWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  setPosition: (id: WindowId, position: { x: number; y: number }) => void;
  closeAll: () => void;
}

let zCounter = 120;

export const useWindowStore = create<WindowState>((set) => ({
  openWindows: [],
  minimized: [],
  activeWindow: null,
  zOrder: {},
  positions: {},
  openWindow: (id) => set((state) => {
    zCounter += 1;
    return {
      openWindows: state.openWindows.includes(id) ? state.openWindows : [...state.openWindows, id],
      minimized: state.minimized.filter((item) => item !== id),
      activeWindow: id,
      zOrder: { ...state.zOrder, [id]: zCounter },
    };
  }),
  closeWindow: (id) => set((state) => {
    const next = state.openWindows.filter((item) => item !== id);
    return {
      openWindows: next,
      minimized: state.minimized.filter((item) => item !== id),
      activeWindow: next.at(-1) ?? null,
    };
  }),
  minimizeWindow: (id) => set((state) => ({
    minimized: state.minimized.includes(id) ? state.minimized : [...state.minimized, id],
    activeWindow: state.openWindows.filter((item) => item !== id).at(-1) ?? null,
  })),
  restoreWindow: (id) => set((state) => {
    zCounter += 1;
    return { minimized: state.minimized.filter((item) => item !== id), activeWindow: id, zOrder: { ...state.zOrder, [id]: zCounter } };
  }),
  focusWindow: (id) => set((state) => {
    zCounter += 1;
    return { activeWindow: id, zOrder: { ...state.zOrder, [id]: zCounter } };
  }),
  setPosition: (id, position) => set((state) => ({ positions: { ...state.positions, [id]: position } })),
  closeAll: () => set({ openWindows: [], minimized: [], activeWindow: null }),
}));

