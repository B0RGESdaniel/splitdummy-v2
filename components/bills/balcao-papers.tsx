import Link from "next/link";

import { BillStatusBadge } from "@/components/bills/bill-status-badge";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const paperLinkClass =
  "block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--balcao-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5";

/**
 * Comanda aberta em cima do balcão: cabeçalho impresso da casa com o selo,
 * nome da conta preenchido à mão sobre a linha, e o rodapé com pessoas,
 * abertura, dono e o parcial.
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
      className={`balcao-comanda ${paperLinkClass} flex flex-col gap-1.5 px-3.5 pt-3 pb-3.5 text-foreground`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[15px] font-bold tracking-tight">Splitdummy</span>
          <span className="text-[11px] font-semibold tracking-[0.08em] tabular-nums">
            Nº {String(number).padStart(3, "0")}
          </span>
        </span>
        <BillStatusBadge isOpen />
      </div>

      <div className="border-b-[1.5px] border-foreground/45 pt-0.5 pb-1.5 font-handwritten text-2xl leading-tight break-words text-[color:var(--ink-handwritten)]">
        {name}
      </div>

      <div className="flex items-end justify-between gap-3 pt-0.5">
        <div className="flex min-w-0 flex-col gap-0.5 text-[13px] leading-snug font-medium tracking-[0.02em]">
          <span className="tabular-nums">
            {participantCount} {participantCount === 1 ? "pessoa" : "pessoas"} · {openedAt}
          </span>
          <span className="flex min-w-0 items-baseline gap-1.5">
            Dono
            <span className="truncate font-handwritten text-base leading-none text-[color:var(--ink-handwritten)]">
              {ownerFirstName}
            </span>
          </span>
        </div>
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
          SPLITDUMMY · CONTA #<span className="font-digits">{String(number).padStart(3, "0")}</span>
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
