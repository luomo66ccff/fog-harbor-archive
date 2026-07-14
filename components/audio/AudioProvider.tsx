"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FogAudioEngine, type SoundCue } from "@/lib/audio-manager";
import { useCaseStore } from "@/store/case-store";

interface AudioContextValue {
  initializeAudio: () => Promise<void>;
  cue: (name: SoundCue) => void;
  initialized: boolean;
}

const FogAudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<FogAudioEngine | null>(null);
  const audio = useCaseStore((state) => state.audio);
  const setSoundDegraded = useCaseStore((state) => state.setSoundDegraded);
  const [initialized, setInitialized] = useState(false);

  const initializeAudio = useCallback(async () => {
    try {
      engine.current ??= new FogAudioEngine();
      await engine.current.initialize();
      engine.current.applySettings(useCaseStore.getState().audio);
      setInitialized(true);
      setSoundDegraded(false);
    } catch {
      setSoundDegraded(true);
    }
  }, [setSoundDegraded]);
  const cue = useCallback((name: SoundCue) => engine.current?.cue(name), []);
  useEffect(() => { engine.current?.applySettings(audio); }, [audio]);
  const value = useMemo(() => ({ initializeAudio, cue, initialized }), [cue, initializeAudio, initialized]);
  return <FogAudioContext.Provider value={value}>{children}</FogAudioContext.Provider>;
}

export function useFogAudio() {
  const value = useContext(FogAudioContext);
  if (!value) throw new Error("useFogAudio must be used inside AudioProvider");
  return value;
}

