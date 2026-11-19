"use client";

import { MotionConfig } from "motion/react";

// Com "reduzir movimento" ligado no aparelho, o Motion desliga sozinho as
// animações de transformação e de layout (deslizes), mantendo só opacidade/cor.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
