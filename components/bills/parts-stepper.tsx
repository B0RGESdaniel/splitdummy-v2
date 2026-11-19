"use client";

import { RollingNumber } from "@/components/bills/rolling-number";
import { Button } from "@/components/ui/button";

export function PartsStepper({
  parts,
  label,
  onIncrement,
  onDecrement,
  disabled,
}: {
  parts: number;
  // O que o número conta, pro leitor de tela: "quantidade de Chopp", "partes de Ana".
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return <RollingNumber value={parts} className="w-8 text-lg font-bold" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={onDecrement}
        aria-label={`Diminuir ${label}`}
      >
        −
      </Button>
      <RollingNumber value={parts} className="w-6 text-lg font-bold" />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={onIncrement}
        aria-label={`Aumentar ${label}`}
      >
        +
      </Button>
    </div>
  );
}
