"use client";

import { useRef, useState } from "react";

import { ExtractedItemsReviewTable } from "@/components/bills/extracted-items-review-table";
import { Button } from "@/components/ui/button";
import type { ExtractedReceiptItem } from "@/lib/receipt/schema";

type ScannerState =
  | { step: "idle" }
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

export function ReceiptScanner({
  billId,
  existingItemsCount,
}: {
  billId: string;
  existingItemsCount: number;
}) {
  const [state, setState] = useState<ScannerState>({ step: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setState({ step: "idle" });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFile(file: File) {
    setState({ step: "extracting" });

    try {
      const compressed = await compressToJpeg(file);
      const formData = new FormData();
      formData.append("billId", billId);
      formData.append("photo", compressed, "receipt.jpg");

      const response = await fetch("/api/ai/extract-receipt", {
        method: "POST",
        body: formData,
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
    } catch {
      setState({
        step: "error",
        message: "Não foi possível ler o cupom.",
      });
    }
  }

  if (state.step === "extracting") {
    return <p className="text-sm text-muted-foreground">Lendo o cupom...</p>;
  }

  if (state.step === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button onClick={reset}>Tentar de novo</Button>
      </div>
    );
  }

  if (state.step === "review") {
    return (
      <ExtractedItemsReviewTable
        billId={billId}
        receiptId={state.receiptId}
        initialItems={state.items}
        existingItemsCount={existingItemsCount}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          void handleFile(file);
        }
      }}
    />
  );
}
