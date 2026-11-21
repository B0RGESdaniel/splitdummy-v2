"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextMorph } from "@/components/ui/text-morph";

type Prepared = { status: "loading" } | { status: "ready"; file: File; canShare: boolean } | { status: "error" };

function fileNameFor(billName: string) {
  const slug = billName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `divideai-${slug || "conta"}.png`;
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Conta paga: manda o cupom (imagem gerada no servidor) pelo compartilhar do
// celular — a folha nativa, de onde sai pro WhatsApp. A imagem é baixada ao
// abrir o Resumo e não no toque: o Safari só deixa compartilhar logo depois
// do gesto, e esperar o download no meio quebraria isso. Onde não dá pra
// compartilhar arquivo (boa parte dos computadores), o botão baixa a imagem.
export function ShareReceiptButton({ billId, billName }: { billId: string; billName: string }) {
  const [prepared, setPrepared] = useState<Prepared>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/bills/${billId}/receipt-image`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      })
      .then((blob) => {
        const file = new File([blob], fileNameFor(billName), { type: "image/png" });
        const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
        setPrepared({ status: "ready", file, canShare });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPrepared({ status: "error" });
      });
    return () => controller.abort();
  }, [billId, billName]);

  async function handleClick() {
    if (prepared.status !== "ready") return;
    if (!prepared.canShare) {
      download(prepared.file);
      return;
    }
    try {
      await navigator.share({ files: [prepared.file], title: billName });
    } catch (error) {
      // Fechar a folha de compartilhar sem escolher nada não é erro.
      if (error instanceof DOMException && error.name === "AbortError") return;
      download(prepared.file);
    }
  }

  if (prepared.status === "error") {
    return (
      <p className="text-center text-sm text-destructive">
        Não deu pra preparar a imagem do cupom. Recarregue a página pra tentar de novo.
      </p>
    );
  }

  const canShare = prepared.status === "ready" && prepared.canShare;

  return (
    <Button
      type="button"
      className="h-10 w-full gap-2"
      disabled={prepared.status !== "ready"}
      onClick={handleClick}
    >
      {canShare || prepared.status === "loading" ? (
        <Share2 data-icon="inline-start" />
      ) : (
        <Download data-icon="inline-start" />
      )}
      <TextMorph>
        {prepared.status === "loading"
          ? "Preparando o cupom..."
          : canShare
            ? "Compartilhar cupom"
            : "Baixar cupom"}
      </TextMorph>
    </Button>
  );
}
