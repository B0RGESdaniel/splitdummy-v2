"use client";

import { Camera, ScanText, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
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
}: {
  billId: string;
  existingItemsCount: number;
}) {
  const [state, setState] = useState<ScanState>({ step: "closed" });
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const queryClient = useQueryClient();
  const overlayOpen = state.step !== "closed";

  // Overlay em tela cheia em vez de Dialog: leva o foco pra dentro ao abrir,
  // pro leitor de tela começar por ele e não pela lista de itens atrás.
  useEffect(() => {
    if (overlayOpen) {
      overlayRef.current?.focus();
    }
  }, [overlayOpen]);

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

  // Lido do cache do TanStack Query em vez de receber como prop fixa: sem
  // navegação entre telas, a página nunca re-renderiza pra atualizar essa
  // contagem — escanear duas vezes na mesma visita usaria um número velho.
  const liveExistingItemsCount =
    queryClient.getQueryData<{ id: string }[]>(["items", billId])?.length ??
    existingItemsCount;

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
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2 rounded-none border-t border-dashed border-border px-0 py-3 text-base text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="size-4" data-icon="inline-start" />
        Escanear cupom
      </Button>

      {overlayOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeOverlay();
            }
          }}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 outline-none"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 id={titleId} className="flex items-center gap-1.5 font-mono text-sm uppercase tracking-wide text-foreground">
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
                <Button onClick={closeOverlay}>Tentar de novo</Button>
              </div>
            )}

            {state.step === "review" && (
              <ExtractedItemsReviewTable
                billId={billId}
                receiptId={state.receiptId}
                initialItems={state.items}
                existingItemsCount={liveExistingItemsCount}
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
