"use client";

import { CloseForMeButton } from "@/components/bills/close-for-me-button";
import { CreateItemButton } from "@/components/bills/create-item-button";
import { ReceiptScanButton } from "@/components/bills/receipt-scan-button";
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
 */
export function ItemsEntryActions({
  billId,
  initialItems,
  isOpen,
}: {
  billId: string;
  initialItems: BillItem[];
  isOpen: boolean;
}) {
  const items = useBillItems(billId, initialItems);
  const isEmpty = items.length === 0;

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
      {!isEmpty && <CloseForMeButton billId={billId} />}
    </>
  );
}
