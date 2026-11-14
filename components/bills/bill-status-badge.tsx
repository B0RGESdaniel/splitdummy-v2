import { cn } from "cn";

export function BillStatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-background",
        isOpen ? "bg-foreground" : "bg-destructive",
      )}
    >
      {isOpen ? "aberta" : "fechada"}
    </span>
  );
}
