"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useReducedMotion } from "motion/react";

import { createBill } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalContainer } from "@/components/theme-scope";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Abrindo..." : "Abrir comanda"}
    </Button>
  );
}

export function CreateBillDialog() {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Em ref: se entrasse nas deps, o ref de callback mudaria quando o valor
  // resolve e o React chamaria de novo, recomeçando a animação.
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  // A folha em branco vira o diálogo ("plus to menu morph" do transitions.dev):
  // o diálogo nasce recortado no retângulo da folha e cresce até o lugar dele.
  // Recorte (clip-path) em vez de escala, pra o texto não esticar no caminho.
  // Ref de callback, não effect: o Portal do Radix monta o conteúdo num render
  // depois do `open`, então só aqui o diálogo já existe.
  const growFromSheet = useCallback(
    (content: HTMLDivElement | null) => {
      const trigger = triggerRef.current;
      if (!content || !trigger || reduceMotionRef.current) return;
      // O StrictMode (dev) chama o ref de novo logo em seguida: medir de novo
      // pegaria o diálogo já deslocado e anularia o movimento.
      if (content.getAnimations().some((animation) => animation.id === "grow-from-sheet")) return;

      const from = trigger.getBoundingClientRect();
      const to = content.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const insetX = Math.max(0, (to.width - from.width) / 2);
      const insetY = Math.max(0, (to.height - from.height) / 2);
      // O token pode vir como "250ms" ou, minificado, ".25s".
      const token = getComputedStyle(content).getPropertyValue("--duration-fast").trim();
      const duration = token.endsWith("ms")
        ? parseFloat(token)
        : parseFloat(token) * 1000 || 250;

      content.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(${insetY}px ${insetX}px)` },
          { transform: "none", clipPath: "inset(0)" },
        ],
        { id: "grow-from-sheet", duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Próxima folha do bloco: tracejada porque ainda não existe. */}
        <button
          ref={triggerRef}
          type="button"
          className="flex min-h-16 w-full items-center justify-center gap-2.5 border-[1.5px] border-dashed border-[color:var(--balcao-line)] text-sm font-semibold tracking-[0.06em] uppercase transition-colors hover:border-[color:var(--balcao-ink)] hover:bg-[color:var(--balcao-ink)]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--balcao-ink)]"
        >
          <Plus className="size-[18px]" strokeWidth={2.25} aria-hidden />
          Abrir nova comanda
        </button>
      </DialogTrigger>
      <DialogContent
        ref={growFromSheet}
        container={portalContainer}
        // Sem a escala nem o esmaecer padrão do diálogo: quem dá o movimento é
        // a folha crescendo, já papel sólido desde o primeiro quadro.
        style={{ "--tw-enter-scale": 1, "--tw-enter-opacity": 1 } as React.CSSProperties}
      >
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>
        <form action={createBill} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome da conta</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Bar do Zé, aniversário da Bia"
              required
              autoFocus
              className="font-handwritten text-lg text-[color:var(--ink-handwritten)]"
            />
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
