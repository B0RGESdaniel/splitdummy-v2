"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { closeBill, updateServiceTax } from "@/app/(dashboard)/bills/actions";
import { CloseBillButton } from "@/components/bills/close-bill-button";
import { ReceiptDisclosure } from "@/components/bills/receipt-disclosure";
import { ServiceTaxEditor } from "@/components/bills/service-tax-editor";
import { SubtleNumber } from "@/components/bills/subtle-number";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import {
  billItemSharesQueryKey,
  useBillItemShares,
  type BillItemShare,
} from "@/lib/bill/bill-item-shares";
import { buildParticipantBreakdowns } from "@/lib/split/breakdown";
import { getUnsplitItemIds, itemTotalCents } from "@/lib/split/calculate";
import type { PartsShareInput } from "@/lib/split/validate";
import type { BillParticipant } from "@/lib/bill/participants";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function BillSummary({
  billId,
  billName,
  billNumber,
  waiter,
  receiptDate,
  serviceTaxPercent,
  isOwner,
  ownerName,
  isOpen,
  justClosed,
  participants,
  initialItems,
  initialShares,
}: {
  billId: string;
  billName: string;
  billNumber: number;
  waiter: string;
  receiptDate: string;
  serviceTaxPercent: number;
  isOwner: boolean;
  ownerName: string;
  isOpen: boolean;
  justClosed: boolean;
  participants: BillParticipant[];
  initialItems: Item[];
  initialShares: BillItemShare[];
}) {
  const itemsQueryKey = ["items", billId];
  const sharesQueryKey = billItemSharesQueryKey(billId);

  const { data: items } = useQuery({
    queryKey: itemsQueryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    initialData: initialItems,
  });

  const shares = useBillItemShares(billId, initialShares);

  useRealtimeTable({ table: "items", billId, queryKey: itemsQueryKey });
  useRealtimeTable({ table: "item_shares", billId, queryKey: sharesQueryKey });

  const sharesByItem = new Map<string, PartsShareInput[]>();
  for (const share of shares) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.participant_id, parts: share.parts ?? 0 });
    sharesByItem.set(share.item_id, list);
  }

  const itemsForSplit = items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    shares: sharesByItem.get(item.id) ?? [],
  }));

  const breakdowns = buildParticipantBreakdowns(
    itemsForSplit,
    participants.map((p) => p.participant_id),
    serviceTaxPercent,
  );

  const grandTotalCents = [...breakdowns.values()].reduce(
    (sum, breakdown) => sum + breakdown.totalCents,
    0,
  );
  const subtotalCents = [...breakdowns.values()].reduce(
    (sum, breakdown) => sum + breakdown.subtotalCents,
    0,
  );

  // Itens sem dono ficam fora do total: com algum deles (ou sem item
  // nenhum) a conta não pode ser marcada como paga — o servidor repete a
  // checagem em `closeBill`.
  const unsplitIds = new Set(getUnsplitItemIds(itemsForSplit));
  const unsplitCents = itemsForSplit
    .filter((item) => unsplitIds.has(item.id))
    .reduce((sum, item) => sum + itemTotalCents(item), 0);
  const canClose = items.length > 0 && unsplitIds.size === 0;

  // Imprime só quando o Resumo abre com a conta aberta; conta fechada já
  // abre no cupom pronto.
  const [printing, setPrinting] = useState(isOpen);

  // Carimbo bate só na transição aberta -> fechada: vista nesta tela (quem
  // fechou e, via realtime, quem estava com o Resumo aberto) ou trazida de
  // Itens/Mesa pelo realtime (`justClosed`, via `?fechou=1`). Ajuste de
  // estado durante o render, sem effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [stampHit, setStampHit] = useState(justClosed);
  // Mesmo momento, falado: leitor de tela não vê o carimbo bater.
  const [announcePaid, setAnnouncePaid] = useState(false);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (prevIsOpen && !isOpen) {
      setStampHit(true);
      setAnnouncePaid(true);
    }
  }

  // Tira o `?fechou=1` da URL pra um recarregar não bater o carimbo de novo.
  // O anúncio espera a região já estar na página: texto presente desde a
  // montagem não é lido.
  useEffect(() => {
    if (!justClosed) return;
    window.history.replaceState(null, "", window.location.pathname);
    const id = setTimeout(() => setAnnouncePaid(true), 100);
    return () => clearTimeout(id);
  }, [justClosed]);

  return (
    <>
      <p role="status" className="sr-only">
        {announcePaid ? "Conta marcada como paga." : ""}
      </p>
      {/* Boca da impressora fixa no topo (não some depois de imprimir), mais
          larga que o papel; o cupom sai de baixo dela. */}
      <div className="pt-2">
        <div aria-hidden className="receipt-printer" />
        <div className="relative mx-1.5 overflow-hidden pb-2">
          <div aria-hidden className="receipt-printer-shadow" />
          <div
            className={printing ? "receipt-printing" : undefined}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setPrinting(false);
            }}
          >
            <div className="cupom-fiscal px-4 py-[18px] text-sm leading-[1.45]">
              {/* Paga: respiro dos dois lados (não só à direita, pra o texto seguir
                  centrado no papel) do tamanho do carimbo, que entra ~74px no texto.
                  O subtítulo não cabe numa linha nesse respiro: quebra de propósito
                  depois do "·", em vez de deixar o número sozinho embaixo. */}
              <h1
                className={cn(
                  "text-center text-lg leading-tight font-bold break-words uppercase",
                  !isOpen && "px-20",
                )}
              >
                {billName}
              </h1>
              <div className={cn("text-muted-foreground text-center text-[13px]", !isOpen && "px-20")}>
                DIVIDE/AI ·{isOpen ? " " : <br />}CONTA #
                <span className="font-digits">{String(billNumber).padStart(3, "0")}</span>
              </div>

              {!isOpen && (
                <div
                  className={cn(
                    "receipt-stamp pointer-events-none absolute top-[26px] right-2 border-[3px] border-destructive px-2.5 py-0.5 text-xl font-bold tracking-[0.08em] text-destructive uppercase",
                    stampHit && "receipt-stamp-hit",
                  )}
                >
                  Pago
                </div>
              )}

              <hr className="my-2.5 border-dashed" />

              {!isOpen && <div className="text-center font-bold">CUPOM DE RATEIO</div>}
              <div className="flex justify-between gap-2 text-xs">
                <span>DATA</span>
                <span className="font-digits">{receiptDate}</span>
              </div>
              <div className="text-xs">
                PESSOAS: <span className="font-digits">{participants.length}</span>
              </div>
              <div className="text-xs uppercase">GARÇOM: {waiter}</div>

              <div className="mt-2.5 flex justify-between gap-2 border-y border-dashed py-1 text-xs">
                <span>NOME</span>
                <span>VALOR</span>
              </div>

              <div className="mt-1.5 flex flex-col">
                {participants.map((participant) => {
                  const {
                    items: participantItems,
                    subtotalCents: subtotal,
                    totalCents: total,
                  } = breakdowns.get(participant.participant_id)!;
                  const header = (
                    <>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-bold uppercase">
                          {participant.display_name}
                          {participant.is_self && (
                            <span className="font-normal"> (VOCÊ)</span>
                          )}
                        </span>
                        <SubtleNumber value={total} format={formatCurrency} className="font-digits font-bold" />
                      </span>
                      <span className="text-muted-foreground flex items-baseline justify-between gap-2 text-[11px]">
                        {participantItems.length === 0 ? (
                          <span>não consumiu nada</span>
                        ) : (
                          <>
                            <span>
                              <span className="font-digits">{participantItems.length}</span>{" "}
                              {participantItems.length === 1 ? "item" : "itens"} ·{" "}
                              <SubtleNumber value={subtotal} format={formatCurrency} className="font-digits" /> + taxa
                            </span>
                            <span className="underline decoration-dotted">
                              ver itens{" "}
                              <span
                                aria-hidden
                                className="inline-block transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-data-[open=true]:-scale-y-100 motion-reduce:transition-none"
                              >
                                ▾
                              </span>
                            </span>
                          </>
                        )}
                      </span>
                    </>
                  );

                  return (
                    <div
                      key={participant.participant_id}
                      className="border-b border-dashed border-border/50 py-2 last:border-b-0"
                    >
                      {participantItems.length === 0 ? (
                        <div className="flex flex-col">{header}</div>
                      ) : (
                        <ReceiptDisclosure summary={header}>
                          <div className="flex flex-col gap-1 pt-2.5 pb-0.5 pl-3 text-xs">
                            {participantItems.map((item) => (
                              <div key={item.id} className="flex justify-between gap-2">
                                <span>
                                  <span className="font-digits">
                                    {item.myParts}/{item.totalParts}
                                  </span>{" "}
                                  {item.description}
                                </span>
                                <span className="font-digits">
                                  {formatCurrency(item.amountCents)}
                                </span>
                              </div>
                            ))}
                            <div className="text-muted-foreground mt-1 flex justify-between gap-2">
                              <span>
                                + taxa <span className="font-digits">{serviceTaxPercent}%</span>
                              </span>
                              <span className="font-digits">
                                {formatCurrency(total - subtotal)}
                              </span>
                            </div>
                          </div>
                        </ReceiptDisclosure>
                      )}
                    </div>
                  );
                })}
              </div>

              {isOpen && !canClose && (
                <div className="mt-2.5 border border-dashed border-foreground px-2.5 py-2 text-center text-xs">
                  {items.length === 0 ? (
                    <>
                      <div className="font-bold">NENHUM ITEM NA CONTA</div>
                      <div>Adicione os itens em Itens.</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">
                        <span className="font-digits">{unsplitIds.size}</span>{" "}
                        {unsplitIds.size === 1 ? "ITEM SEM DONO" : "ITENS SEM DONO"} ·{" "}
                        <SubtleNumber value={unsplitCents} format={formatCurrency} className="font-digits" /> FORA
                        DO TOTAL
                      </div>
                      <div>Divida em Itens antes de marcar como paga.</div>
                    </>
                  )}
                </div>
              )}

              <hr className="my-2.5 border-dashed" />

              <div className="flex justify-between gap-2">
                <span>SUBTOTAL</span>
                <SubtleNumber value={subtotalCents} format={formatCurrency} className="font-digits" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                {isOpen ? (
                  <ServiceTaxEditor
                    serviceTaxPercent={serviceTaxPercent}
                    action={updateServiceTax.bind(null, billId)}
                  />
                ) : (
                  <span>
                    TAXA SERVIÇO <span className="font-digits">{serviceTaxPercent}%</span>
                  </span>
                )}
                <SubtleNumber
                  value={grandTotalCents - subtotalCents}
                  format={formatCurrency}
                  className="font-digits"
                />
              </div>

              <hr className="my-2.5 border-t-[3px] border-double border-foreground" />

              <div className="flex items-center justify-between gap-2 font-bold">
                <span className="text-base">TOTAL</span>
                <SubtleNumber value={grandTotalCents} format={formatCurrency} className="font-digits" />
              </div>

              {!isOpen && (
                <>
                  <hr className="my-2.5 border-dashed" />
                  <div className="text-center text-xs">OBRIGADO E VOLTE SEMPRE</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOpen &&
        (isOwner ? (
          <CloseBillButton
            action={closeBill.bind(null, billId)}
            totalLabel={formatCurrency(grandTotalCents)}
            peopleCount={participants.length}
            serviceTaxPercent={serviceTaxPercent}
            disabled={!canClose}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Quando todos conferirem, {ownerName} marca a conta como paga.
          </p>
        ))}
    </>
  );
}
