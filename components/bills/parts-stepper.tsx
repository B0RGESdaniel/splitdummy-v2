"use client";

import { Button } from "@/components/ui/button";

export function PartsStepper({
  parts,
  onIncrement,
  onDecrement,
  disabled,
}: {
  parts: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span className="w-8 text-center text-lg font-bold">{parts}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        onClick={onDecrement}
        aria-label="Diminuir partes"
      >
        −
      </Button>
      <span className="w-6 text-center text-lg font-bold">{parts}</span>
      <Button
        type="button"
        size="icon-sm"
        onClick={onIncrement}
        aria-label="Aumentar partes"
      >
        +
      </Button>
    </div>
  );
}
