import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Campos da folha de entrada como células da grade da comanda (Conta, Dono…
// em Itens): rótulo impresso pequeno e o valor escrito à mão.
export function SheetGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y-[1.5px] divide-foreground border-[1.5px] border-foreground">
      {children}
    </div>
  );
}

export function SheetCell({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const labelClass = "text-[11px] leading-relaxed font-medium tracking-wide uppercase";
  return (
    // Foco no campo marca a célula inteira: a linha de baixo dos inputs da
    // comanda não existe aqui, a borda da grade já faz esse papel.
    <div className="flex flex-col px-3 pt-1 pb-1.5 focus-within:outline-[1.5px] focus-within:-outline-offset-[4px] focus-within:outline-foreground">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
    </div>
  );
}

const handwrittenClass = "font-handwritten text-xl text-[color:var(--ink-handwritten)]";

export function SheetInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full min-w-0 bg-transparent normal-case outline-none placeholder:text-[color:var(--ink-handwritten)]/40",
        handwrittenClass,
        className,
      )}
      {...props}
    />
  );
}

export function SheetValue({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className={cn("min-w-0 break-words normal-case", handwrittenClass)}>{children}</span>
      {action}
    </div>
  );
}
