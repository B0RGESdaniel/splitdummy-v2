"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cn } from "cn";

// Sobe ao aumentar, desce ao diminuir: o novo valor entra pelo lado oposto
// ao que o antigo sai, como um odômetro.
const variants: Variants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction: number) => ({ y: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

export function RollingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  // Direção derivada durante o render (ajuste de estado, sem effect).
  const [prevValue, setPrevValue] = useState(value);
  const [direction, setDirection] = useState(1);
  if (prevValue !== value) {
    setDirection(value > prevValue ? 1 : -1);
    setPrevValue(value);
  }

  return (
    <span className={cn("relative inline-flex justify-center overflow-hidden", className)}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.span
          key={value}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
