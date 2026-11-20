import { cn } from "@/lib/utils";

// A casa é o Divide/ai: "Divide" em Bitter regular e "/ai" em extra-negrito.
// O peso é o que separa as duas partes — a barra é a da própria fonte, sem
// desenho à parte, então não há nada pra alinhar à mão.
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display tracking-tight whitespace-nowrap", className)}>
      <span className="font-normal">Divide</span>
      <span className="font-extrabold">/ai</span>
    </span>
  );
}
