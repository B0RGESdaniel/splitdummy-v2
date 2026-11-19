"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * O único "voltar" da conta, no masthead: sobe um nível. Mesa e Resumo
 * voltam pra Itens (a tela principal); Itens volta pro histórico. Conta
 * paga não tem mais Itens (redireciona pro Resumo), então o Resumo dela
 * volta direto pro histórico.
 */
export function BillBackButton({ billId, isOpen }: { billId: string; isOpen: boolean }) {
  const segment = useSelectedLayoutSegment();
  const toItems = isOpen && (segment === "participants" || segment === "summary");

  return (
    <Button asChild variant="ghost" size="icon-lg" className="-ml-2 shrink-0">
      {toItems ? (
        <Link href={`/bills/${billId}/items`} aria-label="Voltar para os itens">
          <ArrowLeft />
        </Link>
      ) : (
        <Link href="/" aria-label="Voltar para suas contas">
          <ArrowLeft />
        </Link>
      )}
    </Button>
  );
}
