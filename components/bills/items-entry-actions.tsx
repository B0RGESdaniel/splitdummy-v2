"use client";

import { CloseForMeButton } from "@/components/bills/close-for-me-button";
import { CreateItemButton } from "@/components/bills/create-item-button";
import { ReceiptScanButton } from "@/components/bills/receipt-scan-button";
import {
  splitItemIdsOf,
  useBillItemShares,
  type BillItemShare,
} from "@/lib/bill/bill-item-shares";
import { useBillItems, type BillItem } from "@/lib/bill/bill-items";

/**
 * Ações abaixo da lista de Itens. Com a conta vazia, a foto do cupom vira a
 * ação principal (moldura "comanda em branco") e escrever à mão fica como
 * alternativa; o "fecha para mim" some, porque não há nada pra fechar. Com
 * itens, volta a ordem de sempre: escrever, depois escanear.
 *
 * Os dois botões trocam de ordem por `key`, sem desmontar: a leitura de
 * cupom em andamento (overlay aberto) sobrevive à chegada do primeiro item,
 * seja o salvo por ela mesma, seja um que outro participante adicionou.
 *
 * Acima do "fecha para mim", a contagem de itens sem dono avisa antes do
 * toque o que o aviso do botão diria depois. Só a contagem, sem valor.
 */
export function ItemsEntryActions({
  billId,
  initialItems,
  initialShares,
  isOpen,
}: {
  billId: string;
  initialItems: BillItem[];
  initialShares: BillItemShare[];
  isOpen: boolean;
}) {
  const items = useBillItems(billId, initialItems);
  const shares = useBillItemShares(billId, initialShares);
  const isEmpty = items.length === 0;
  const splitItemIds = splitItemIdsOf(shares);
  const pendingCount = items.filter((item) => !splitItemIds.has(item.id)).length;

  const scan = (
    <ReceiptScanButton
      key="scan"
      billId={billId}
      existingItemsCount={items.length}
      prominent={isEmpty}
    />
  );
  const create = (
    <CreateItemButton
      key="create"
      billId={billId}
      label={isEmpty ? "ou escreva à mão" : undefined}
    />
  );

  return (
    <>
      {isOpen && (isEmpty ? [scan, create] : [create, scan])}
      {/* Sempre no rodapé: com lista curta, `mt-auto` empurra pro fim da
          tela; com lista longa, `sticky` segura no fim enquanto rola — o
          caminho pro Resumo não depende de rolar até o fim. Faixa de papel
          pra não deixar itens aparecendo por trás. */}
      {!isEmpty && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-auto -mb-4 border-t-[1.5px] border-foreground bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          {pendingCount > 0 && (
            <div className="mb-2 text-center text-[11px] font-semibold tracking-[0.08em] uppercase tabular-nums">
              {pendingCount === 1 ? "1 item sem dono" : `${pendingCount} itens sem dono`}
            </div>
          )}
          <CloseForMeButton billId={billId} />
        </div>
      )}
    </>
  );
}
