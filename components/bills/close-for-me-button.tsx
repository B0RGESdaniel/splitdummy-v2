"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConciergeBell } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";

import { usePortalContainer } from "@/components/theme-scope";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  billItemSharesQueryKey,
  fetchBillItemShares,
  splitItemIdsOf,
} from "@/lib/bill/bill-item-shares";
import { WAITER_NICKNAMES, waiterForBill } from "@/lib/bill/waiter";

type Item = { id: string; description: string; unit_price: number; quantity: number };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROTATE_EVERY_MS = 2500;
const LAYOUT_TRANSITION = { duration: 0.25, ease: "easeOut" } as const;

/**
 * Atalho pro Resumo no fim da lista de Itens. O vocativo gira entre os
 * apelidos de garçom ("Ô meu Chefe, fecha para mim", "Ô meu Patrão, …"),
 * começando pelo garçom da conta — o mesmo do cupom. "Ô meu" fica fixo.
 * Com reduzir movimento, o apelido fica parado.
 *
 * Só leva pro Resumo com todos os itens divididos: com algum pendente, abre
 * um aviso listando quais. As partes são buscadas de novo no toque (não só
 * lidas do cache) porque exclusões em cascata de `item_shares` — ex.: ao
 * remover um participante — não chegam pelo Realtime.
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

  const router = useRouter();
  const queryClient = useQueryClient();
  const portalContainer = usePortalContainer();
  const [unsplitItems, setUnsplitItems] = useState<Item[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);
  const summaryHref = `/bills/${billId}/summary`;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const items = queryClient.getQueryData<Item[]>(["items", billId]) ?? [];
    const shares = await queryClient.fetchQuery({
      queryKey: billItemSharesQueryKey(billId),
      queryFn: () => fetchBillItemShares(billId),
      staleTime: 0,
    });
    const splitItemIds = splitItemIdsOf(shares);
    const pending = items.filter((item) => !splitItemIds.has(item.id));

    if (pending.length === 0) {
      router.push(summaryHref);
      return;
    }
    setUnsplitItems(pending);
    setWarningOpen(true);
  }

  return (
    <>
      <Button asChild className="h-10 w-full justify-center gap-2 px-3 text-[0.9375rem] whitespace-nowrap max-sm:text-[0.8125rem] [&_svg:not([class*='size-'])]:size-[18px]">
        <Link href={summaryHref} onClick={handleClick}>
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

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent container={portalContainer}>
          <DialogHeader>
            <DialogTitle>Ainda tem coisa sem dono</DialogTitle>
            <DialogDescription>
              Divida esses itens antes de fechar a conta — do jeito que estão, ninguém paga por eles.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex min-w-0 flex-col gap-1 border-[1.5px] border-dashed border-foreground px-3 py-2">
            {unsplitItems.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-handwritten text-lg text-[color:var(--ink-handwritten)]">
                  {item.description}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setWarningOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
