import { cn } from "cn";

export function BillStatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-background shadow-[inset_0_0_0_1.5px_var(--background)]",
        isOpen ? "bg-foreground" : "bg-destructive -rotate-2",
      )}
    >
      {isOpen ? "aberta" : "fechada"}
    </span>
  );
}
