"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConciergeBell } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { WAITER_NICKNAMES, waiterForBill } from "@/lib/bill/waiter";

const ROTATE_EVERY_MS = 2500;
const LAYOUT_TRANSITION = { duration: 0.25, ease: "easeOut" } as const;

/**
 * Atalho pro Resumo no fim da lista de Itens. O vocativo gira entre os
 * apelidos de garçom ("Ô meu Chefe, fecha para mim", "Ô meu Patrão, …"),
 * começando pelo garçom da conta — o mesmo do cupom. "Ô meu" fica fixo.
 * Com reduzir movimento, o apelido fica parado.
 */
export function CloseForMeButton({ billId }: { billId: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(() => WAITER_NICKNAMES.indexOf(waiterForBill(billId)));

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % WAITER_NICKNAMES.length),
      ROTATE_EVERY_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  const nickname = WAITER_NICKNAMES[index];

  return (
    <Button asChild className="mt-5 h-10 w-full justify-center gap-2 px-3 text-[0.9375rem] whitespace-nowrap max-sm:text-[0.8125rem] [&_svg:not([class*='size-'])]:size-[18px]">
      <Link href={`/bills/${billId}/summary`}>
        {/* Os apelidos têm larguras bem diferentes ("Rei" vs. "Marquês do
            Atendimento"): o bloco recentraliza a cada troca, e ícone e
            "fecha para mim" deslizam pra posição nova em vez de pular. */}
        <motion.span layout="position" className="inline-flex" transition={LAYOUT_TRANSITION}>
          <ConciergeBell />
        </motion.span>
        <span className="inline-flex items-baseline">
          <motion.span aria-hidden layout="position" className="me-[0.3em]" transition={LAYOUT_TRANSITION}>
            Ô meu
          </motion.span>
          <span aria-hidden className="relative inline-flex overflow-y-clip">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={nickname}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={LAYOUT_TRANSITION}
              >
                {nickname},
              </motion.span>
            </AnimatePresence>
          </span>
          <motion.span layout="position" className="ms-[0.3em]" transition={LAYOUT_TRANSITION}>
            fecha para mim
          </motion.span>
        </span>
      </Link>
    </Button>
  );
}
