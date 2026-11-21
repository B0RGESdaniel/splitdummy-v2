import Link from "next/link";
import { ViewTransition } from "react";

import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { BrandWordmark } from "@/components/brand-wordmark";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const paperLinkClass =
  "block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--balcao-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5";

/**
 * Comanda aberta em cima do balcão: repete o topo da tela da conta em
 * miniatura — masthead só com o impresso (casa + Nº) e a grade de campos
 * (Conta, Dono, Participantes, selo) — e um rodapé com abertura e parcial.
 */
export function BalcaoComanda({
  billId,
  name,
  number,
  ownerFirstName,
  participantCount,
  openedAt,
  partialCents,
}: {
  billId: string;
  name: string;
  number: number;
  ownerFirstName: string;
  participantCount: number;
  openedAt: string;
  partialCents: number;
}) {
  return (
    <Link
      href={`/bills/${billId}/items`}
      transitionTypes={["abrir-comanda"]}
      className={`balcao-comanda ${paperLinkClass} flex flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5 text-foreground`}
    >
      <div className="-mx-3.5 flex items-baseline gap-2 border-b-[1.5px] border-border px-3.5 pb-2.5">
        {/* Par com o masthead da conta e, abaixo, com a grade de Itens: ao
            abrir, a comanda em miniatura cresce até virar a tela. */}
        <ViewTransition name={`comanda-masthead-${billId}`} share="comanda-morph" default="none">
          <span className="flex items-baseline gap-2">
            <BrandWordmark className="text-lg" />
            <span className="text-[11px] font-semibold tracking-[0.08em] tabular-nums">
              Nº {String(number).padStart(3, "0")}
            </span>
          </span>
        </ViewTransition>
      </div>

      <ViewTransition name={`comanda-grade-${billId}`} share="comanda-morph" default="none">
        <div className="grid grid-cols-[1fr_1fr_0.8fr] border-[1.5px] border-foreground text-xs">
          <div className="col-span-full border-b-[1.5px] border-foreground px-3 pt-1 pb-1.5">
            <div className="text-[11px] uppercase tracking-wide">Conta</div>
            <div className="line-clamp-2 translate-y-[5px] font-handwritten text-xl leading-[1.15] break-words text-[color:var(--ink-handwritten)]">
              {name}
            </div>
          </div>
          <div className="min-w-0 border-r-[1.5px] border-foreground px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide">Dono</div>
            <div className="translate-y-[5px] truncate font-handwritten text-lg text-[color:var(--ink-handwritten)]">
              {ownerFirstName}
            </div>
          </div>
          <div className="min-w-0 border-r-[1.5px] border-foreground px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide">Participantes</div>
            <div className="translate-y-[5px] font-handwritten text-lg text-[color:var(--ink-handwritten)]">
              {participantCount}
            </div>
          </div>
          <div className="flex items-center justify-center px-3 py-2">
            <BillStatusBadge isOpen />
          </div>
        </div>
      </ViewTransition>

      <div className="flex items-end justify-between gap-3">
        <span className="text-[13px] leading-snug font-medium tracking-[0.02em] tabular-nums">
          Aberta {openedAt}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-[11px] font-semibold tracking-[0.08em]">Parcial</span>
          <span className="text-xl leading-tight font-semibold tabular-nums">
            {formatCurrency(partialCents)}
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * Conta paga: cupom térmico em miniatura, com o carimbo PAGO parado (a batida
 * do carimbo só acontece no Resumo, no momento do fechamento).
 */
export function BalcaoCupom({
  billId,
  name,
  number,
  paidAt,
  participantCount,
  totalCents,
  ownCents,
}: {
  billId: string;
  name: string;
  number: number;
  paidAt: string;
  participantCount: number;
  totalCents: number;
  ownCents: number;
}) {
  return (
    <Link href={`/bills/${billId}/summary`} className={`balcao-cupom ${paperLinkClass} mx-3.5`}>
      <div className="cupom-fiscal flex flex-col gap-0.5 px-4 py-3 text-[13px] leading-[1.45]">
        <div className="pr-16 text-center text-[15px] font-bold break-words uppercase">{name}</div>
        <div className="pr-16 text-center text-[11px] text-muted-foreground">
          DIVIDE/AI · CONTA #<span className="font-digits">{String(number).padStart(3, "0")}</span>
        </div>

        <hr className="mt-2 mb-1.5 border-dashed" />

        <div className="flex justify-between gap-2">
          <span>DATA</span>
          <span className="font-digits">{paidAt}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>PESSOAS</span>
          <span className="font-digits">{participantCount}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>TOTAL DA CONTA</span>
          <span className="font-digits">{formatCurrency(totalCents)}</span>
        </div>

        <hr className="mt-2 mb-1.5 border-t-[3px] border-double border-foreground" />

        <div className="flex items-baseline justify-between gap-2 font-bold">
          <span>VOCÊ PAGOU</span>
          <span className="font-digits text-[22px] font-normal">{formatCurrency(ownCents)}</span>
        </div>

        <div
          aria-hidden
          className="receipt-stamp pointer-events-none absolute top-3 right-3 border-[3px] border-destructive px-2 py-0.5 text-lg font-bold tracking-[0.08em] text-destructive uppercase"
        >
          Pago
        </div>
      </div>
    </Link>
  );
}
