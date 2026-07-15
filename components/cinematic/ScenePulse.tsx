"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CinematicTone } from "@/components/cinematic/CinematicCaption";

export type ScenePulseIntensity = "soft" | "medium" | "strong";

const durationByIntensity: Record<ScenePulseIntensity, number> = {
  soft: 0.8,
  medium: 1.05,
  strong: 1.3,
};

interface ScenePulseProps {
  eventId: string;
  tone: CinematicTone;
  intensity?: ScenePulseIntensity;
}

export function ScenePulse({ eventId, tone, intensity = "medium" }: ScenePulseProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`scene-pulse tone-${tone} intensity-${intensity} ${reduceMotion ? "is-reduced" : ""}`}
      data-scene-pulse={eventId}
      aria-hidden="true"
      initial={false}
      animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 0.88, 0], scale: [0.985, 1.012, 1] }}
      transition={{ duration: reduceMotion ? 0 : durationByIntensity[intensity], times: [0, 0.26, 1], ease: "easeOut" }}
    >
      <span className="scene-pulse__wash" />
      <span className="scene-pulse__line" />
    </motion.div>
  );
}
