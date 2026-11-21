"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
  confirmReceiptItems,
  discardReceipt,
  type ReceiptItemInput,
  type SavedReceiptItem,
} from "@/app/(bill)/bills/[billId]/items/receipt-actions";
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
import { Input } from "@/components/ui/input";
import { MAX_ITEM_DESCRIPTION_LENGTH } from "@/lib/bill/item-description";
import type { ExtractedReceiptItem } from "@/lib/receipt/schema";
import { shake } from "@/lib/ui/shake";

// Mesma cascata da lista de Itens: as linhas lidas entram uma após a outra.
const ROW_STAGGER_S = 0.05;
const ROW_ENTER = { opacity: 0, y: -6 };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Soma em centavos pra não acumular erro de float; campo inválido conta zero. */
function sumItems(items: ReceiptItemInput[]) {
  const cents = items.reduce((total, item) => {
    const line = Math.round(item.quantity * item.unitPrice * 100);
    return Number.isFinite(line) ? total + line : total;
  }, 0);
  return cents / 100;
}

export function ExtractedItemsReviewTable({
  billId,
  receiptId,
  initialItems,
  existingItemsCount,
  onSaved,
  onDone,
}: {
  billId: string;
  receiptId: string;
  initialItems: ExtractedReceiptItem[];
  existingItemsCount: number;
  onSaved: (savedItems: SavedReceiptItem[], mode: "append" | "replace") => void;
  onDone: () => void;
}) {
  const portalContainer = usePortalContainer();
  const [items, setItems] = useState<ReceiptItemInput[]>(
    initialItems.map((item) => ({ ...item })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [modeDialogOpen, setModeDialogOpen] = useState(false);

  function updateItem(index: number, patch: Partial<ReceiptItemInput>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function save(mode: "append" | "replace") {
    setIsSaving(true);
    try {
      const savedItems = await confirmReceiptItems(billId, receiptId, items, mode);
      onSaved(savedItems, mode);
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar os itens.",
      );
      setIsSaving(false);
    }
  }

  async function discard() {
    setIsSaving(true);
    try {
      await discardReceipt(billId, receiptId);
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível descartar.",
      );
      setIsSaving(false);
    }
  }

  // O servidor descarta em silêncio item com quantidade ou preço inválido;
  // aqui o botão trava antes, pra "Salvar N itens" não salvar menos que N.
  const hasInvalidQuantity = items.some(
    (item) => !Number.isFinite(item.quantity) || item.quantity <= 0,
  );
  const hasInvalidPrice = items.some(
    (item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0,
  );

  function handleSaveClick() {
    if (existingItemsCount > 0) {
      setModeDialogOpen(true);
      return;
    }
    void save("append");
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="border border-dashed border-border py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum item pra revisar — descarte e tente outra foto.
          </p>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-foreground">
              <th scope="col" className="border-b-[1.5px] border-border px-1 pb-1.5 font-medium">
                Descrição
              </th>
              <th
                scope="col"
                className="w-14 border-b-[1.5px] border-border px-1 pb-1.5 text-right font-medium"
              >
                Qtd
              </th>
              <th
                scope="col"
                className="w-24 border-b-[1.5px] border-border px-1 pb-1.5 text-right font-medium"
              >
                Preço un.
              </th>
              <th
                scope="col"
                className="w-8 border-b-[1.5px] border-border px-1 pb-1.5 font-medium"
              >
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              // Só anima na montagem: as linhas não remontam depois (chave é o
              // índice), então editar/remover um item não repete a cascata.
              <motion.tr
                key={index}
                initial={ROW_ENTER}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * ROW_STAGGER_S, duration: 0.2 }}
              >
                <td className="px-1 py-2">
                  <Input
                    aria-label="Descrição"
                    className="font-handwritten text-base text-[color:var(--ink-handwritten)]"
                    value={item.description}
                    maxLength={MAX_ITEM_DESCRIPTION_LENGTH}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-2">
                  <Input
                    aria-label="Quantidade"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    className="text-right"
                    aria-invalid={!(item.quantity > 0) || undefined}
                    value={item.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      if (item.quantity > 0 && !(quantity > 0)) shake(event.currentTarget);
                      updateItem(index, { quantity });
                    }}
                  />
                </td>
                <td className="px-1 py-2">
                  <Input
                    aria-label="Preço unitário"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    className="text-right"
                    aria-invalid={!(item.unitPrice > 0) || undefined}
                    value={item.unitPrice}
                    onChange={(event) => {
                      const unitPrice = Number(event.target.value);
                      if (item.unitPrice > 0 && !(unitPrice > 0)) shake(event.currentTarget);
                      updateItem(index, { unitPrice });
                    }}
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover item"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
          {/* Só a soma dos itens revisados, sem taxa: é pra conferir com o papel. */}
          <tfoot>
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: initialItems.length * ROW_STAGGER_S, duration: 0.2 }}
            >
              <th
                scope="row"
                colSpan={2}
                className="border-t-[1.5px] border-border px-1 pt-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground"
              >
                Soma dos itens
              </th>
              <td className="border-t-[1.5px] border-border px-1 pt-2 text-right font-semibold tabular-nums">
                {formatCurrency(sumItems(items))}
              </td>
              <td className="border-t-[1.5px] border-border" />
            </motion.tr>
          </tfoot>
        </table>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: initialItems.length * ROW_STAGGER_S, duration: 0.2 }}
        className="mt-2 flex flex-col gap-2"
      >
        {hasInvalidQuantity && (
          <p role="alert" className="text-sm text-destructive">
            Quantidade precisa ser maior que zero.
          </p>
        )}
        {hasInvalidPrice && (
          <p role="alert" className="text-sm text-destructive">
            Preço precisa ser maior que zero.
          </p>
        )}
        <Button
          type="button"
          disabled={isSaving || items.length === 0 || hasInvalidQuantity || hasInvalidPrice}
          onClick={handleSaveClick}
        >
          {isSaving
            ? "Salvando..."
            : `Salvar ${items.length} ${items.length === 1 ? "item" : "itens"}`}
        </Button>
        <Button type="button" variant="ghost" disabled={isSaving} onClick={discard}>
          Descartar
        </Button>
      </motion.div>

      <Dialog open={modeDialogOpen} onOpenChange={setModeDialogOpen}>
        <DialogContent container={portalContainer}>
          <DialogHeader>
            <DialogTitle>Essa conta já tem itens</DialogTitle>
            <DialogDescription>
              Essa conta já tem {existingItemsCount}{" "}
              {existingItemsCount === 1 ? "item" : "itens"} cadastrados.
              Substituir tudo também apaga as divisões (partes) que já tinham
              sido feitas nesses itens — não só a lista.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setModeDialogOpen(false);
                void save("append");
              }}
            >
              Manter e adicionar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => {
                setModeDialogOpen(false);
                void save("replace");
              }}
            >
              Substituir tudo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setModeDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
