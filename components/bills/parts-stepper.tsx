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
    return <span className="w-8 text-center font-medium">{parts}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onDecrement}>
        −
      </Button>
      <span className="w-6 text-center font-medium">{parts}</span>
      <Button type="button" variant="outline" size="sm" onClick={onIncrement}>
        +
      </Button>
    </div>
  );
}
