"use client";

import { Camera, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
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

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function compressToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
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
  const queryClient = useQueryClient();

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

      setState({ step: "review", receiptId: body.receiptId, items: body.items });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setState({ step: "error", message: "Não foi possível ler o cupom." });
    }
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

      {state.step !== "closed" && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4">
          <div className="mx-auto flex w-full max-w-md flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-wide text-foreground">
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
  
            {state.step === "extracting" && (
              <p className="text-sm text-muted-foreground">Lendo o cupom...</p>
            )}
  
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
                onDone={closeOverlay}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
