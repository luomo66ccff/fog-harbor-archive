"use client";

import { MotionConfig } from "framer-motion";
import { AudioProvider } from "@/components/audio/AudioProvider";

export function GameProviders({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}><AudioProvider>{children}</AudioProvider></MotionConfig>;
}

