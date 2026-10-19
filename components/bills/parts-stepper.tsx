"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function StepButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {label}
    </Button>
  );
}

export function PartsStepper({
  parts,
  increment,
  decrement,
  disabled,
}: {
  parts: number;
  increment: () => void | Promise<void>;
  decrement: () => void | Promise<void>;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span className="w-8 text-center font-medium">{parts}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <form action={decrement}>
        <StepButton label="−" />
      </form>
      <span className="w-6 text-center font-medium">{parts}</span>
      <form action={increment}>
        <StepButton label="+" />
      </form>
    </div>
  );
}
