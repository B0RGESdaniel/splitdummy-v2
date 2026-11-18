"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  confirmReceiptItems,
  discardReceipt,
  type ReceiptItemInput,
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
import type { ExtractedReceiptItem } from "@/lib/receipt/schema";

export function ExtractedItemsReviewTable({
  billId,
  receiptId,
  initialItems,
  existingItemsCount,
  onDone,
}: {
  billId: string;
  receiptId: string;
  initialItems: ExtractedReceiptItem[];
  existingItemsCount: number;
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
      await confirmReceiptItems(billId, receiptId, items, mode);
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
            <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
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
              <tr key={index}>
                <td className="border-b border-border px-1 py-2">
                  <Input
                    aria-label="Descrição"
                    className="font-handwritten text-base text-[color:var(--ink-handwritten)]"
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                  />
                </td>
                <td className="border-b border-border px-1 py-2">
                  <Input
                    aria-label="Quantidade"
                    type="number"
                    min="0"
                    step="1"
                    className="text-right"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: Number(event.target.value) })
                    }
                  />
                </td>
                <td className="border-b border-border px-1 py-2">
                  <Input
                    aria-label="Preço unitário"
                    type="number"
                    min="0"
                    step="0.01"
                    className="text-right"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(index, { unitPrice: Number(event.target.value) })
                    }
                  />
                </td>
                <td className="border-b border-border px-1 py-2 text-center">
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
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button
          type="button"
          disabled={isSaving || items.length === 0}
          onClick={handleSaveClick}
        >
          {isSaving
            ? "Salvando..."
            : `Salvar ${items.length} ${items.length === 1 ? "item" : "itens"}`}
        </Button>
        <Button type="button" variant="ghost" disabled={isSaving} onClick={discard}>
          Descartar
        </Button>
      </div>

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
