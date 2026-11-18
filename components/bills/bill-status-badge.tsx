import { cn } from "cn";

export function BillStatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        "inline-block -rotate-2 px-3 py-1.5 text-base font-bold uppercase tracking-wide text-background shadow-[inset_0_0_0_1.5px_var(--background)]",
        isOpen ? "bg-foreground" : "bg-destructive",
      )}
    >
      {isOpen ? "aberta" : "fechada"}
    </span>
  );
}
