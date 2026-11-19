"use client";

import { Camera, ScanText, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { SavedReceiptItem } from "@/app/(bill)/bills/[billId]/items/receipt-actions";
import { Button } from "@/components/ui/button";
import { TextScanner } from "@/components/ui/text-scanner";
import type { ExtractedReceiptItem } from "@/lib/receipt/schema";

const ExtractedItemsReviewTable = dynamic(
  () =>
    import("@/components/bills/extracted-items-review-table").then(
      (mod) => mod.ExtractedItemsReviewTable,
    ),
  { ssr: false },
);

type ScanState =
  | { step: "closed" }
  | { step: "extracting" }
  | { step: "review"; receiptId: string; items: ExtractedReceiptItem[] }
  | { step: "error"; message: string };

function ScanningStatus() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center pb-16">
      <TextScanner text="Lendo o cupom" className="text-3xl" />
    </div>
  );
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function compressToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Não foi possível comprimir a imagem.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export function ReceiptScanButton({
  billId,
  existingItemsCount,
  prominent = false,
}: {
  billId: string;
  /** Contagem ao vivo (vem da query de itens), pra "manter/substituir" na revisão. */
  existingItemsCount: number;
  /** Conta vazia: vira a moldura "comanda em branco", com a foto como ação principal. */
  prominent?: boolean;
}) {
  const [state, setState] = useState<ScanState>({ step: "closed" });
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const queryClient = useQueryClient();
  const overlayOpen = state.step !== "closed";

  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Overlay em tela cheia em vez de Dialog: leva o foco pra dentro ao abrir,
  // pro leitor de tela começar por ele e não pela lista de itens atrás, e
  // devolve pro botão de escanear ao fechar.
  useEffect(() => {
    if (overlayOpen) {
      overlayRef.current?.focus();
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
    }
    wasOpen.current = overlayOpen;
  }, [overlayOpen]);

  // Tab e Esc só valem pro próprio overlay: o diálogo "manter/substituir" da
  // revisão é portal (fora do overlay no DOM), mas o evento sobe pela árvore
  // do React até aqui — sem essa checagem, Esc nele fecharia a leitura toda.
  function handleOverlayKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const overlay = overlayRef.current;
    if (!overlay || !overlay.contains(event.target as Node)) return;

    if (event.key === "Escape") {
      closeOverlay();
      return;
    }
    if (event.key !== "Tab") return;

    // Prende o foco: do último volta pro primeiro e vice-versa.
    const focusables = Array.from(
      overlay.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === overlay)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeOverlay() {
    abortRef.current?.abort();
    setState({ step: "closed" });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFile(file: File) {
    setState({ step: "extracting" });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const compressed = await compressToJpeg(file);
      const formData = new FormData();
      formData.append("billId", billId);
      formData.append("photo", compressed, "receipt.jpg");

      const response = await fetch("/api/ai/extract-receipt", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const body = await response.json();

      if (!response.ok) {
        setState({
          step: "error",
          message: body.error ?? "Não foi possível ler o cupom.",
        });
        return;
      }

      setState({
        step: "review",
        receiptId: body.receiptId,
        items: body.items,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setState({ step: "error", message: "Não foi possível ler o cupom." });
    }
  }

  // Quem salvou já recebe a lista final da action e escreve no cache: uma
  // troca só, sem depender do eco do realtime.
  function handleSaved(
    savedItems: SavedReceiptItem[],
    mode: "append" | "replace",
  ) {
    queryClient.setQueryData<SavedReceiptItem[]>(
      ["items", billId],
      (current = []) =>
        mode === "replace" ? savedItems : [...current, ...savedItems],
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />
      {prominent ? (
        <div className="flex flex-col items-center gap-4 border-[1.5px] border-dashed border-foreground px-5 pt-8 pb-6">
          <Camera className="size-10" aria-hidden />
          <h2 className="text-lg font-semibold tracking-wide">Comanda em branco</h2>
          <p className="text-center text-[13px] leading-snug text-balance text-muted-foreground">
            A leitura preenche os itens e você confere tudo antes de salvar.
          </p>
          <Button
            ref={triggerRef}
            type="button"
            className="h-10 w-full gap-2 text-[0.9375rem] [&_svg:not([class*='size-'])]:size-[18px]"
            onClick={() => inputRef.current?.click()}
          >
            <Camera data-icon="inline-start" />
            Fotografar o cupom
          </Button>
        </div>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 rounded-none border-t border-dashed border-border px-0 py-3 text-base text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" data-icon="inline-start" />
          Escanear cupom
        </Button>
      )}

      {overlayOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleOverlayKeyDown}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 outline-none"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 id={titleId} className="flex items-center gap-1.5 text-sm uppercase tracking-wide text-foreground">
                <ScanText className="size-4" aria-hidden />
                Escanear cupom
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Fechar"
                onClick={closeOverlay}
              >
                <X />
              </Button>
            </div>

            {state.step === "extracting" && <ScanningStatus />}

            {state.step === "error" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-destructive">{state.message}</p>
                <Button
                  onClick={() => {
                    // Chamado dentro do próprio toque: o navegador só abre o
                    // seletor de arquivo/câmera a partir de um gesto do usuário.
                    closeOverlay();
                    inputRef.current?.click();
                  }}
                >
                  Tentar de novo
                </Button>
              </div>
            )}

            {state.step === "review" && (
              <ExtractedItemsReviewTable
                billId={billId}
                receiptId={state.receiptId}
                initialItems={state.items}
                existingItemsCount={existingItemsCount}
                onSaved={handleSaved}
                onDone={closeOverlay}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
