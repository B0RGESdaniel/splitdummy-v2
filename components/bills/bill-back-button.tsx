"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

/**
 * O único "voltar" da conta, no masthead: sobe um nível. Mesa e Resumo
 * voltam pra Itens (a tela principal); Itens volta pro histórico. Conta
 * paga não tem mais Itens (redireciona pro Resumo), então o Resumo dela
 * volta direto pro histórico. O id vem da URL, não do servidor: o botão
 * aparece na casca da conta antes de os dados chegarem (`isOpen` chega depois;
 * até lá vale "aberta", que é o caso comum). Na pré-renderização da casca o
 * id ainda não existe e o fallback volta pro histórico.
 */
export function BillBackButton({ isOpen = true }: { isOpen?: boolean }) {
  return (
    <Suspense fallback={<BackLink href="/" label="Voltar para suas contas" />}>
      <ContextualBackLink isOpen={isOpen} />
    </Suspense>
  );
}

function ContextualBackLink({ isOpen }: { isOpen: boolean }) {
  const { billId } = useParams<{ billId: string }>();
  const segment = useSelectedLayoutSegment();
  const toItems = isOpen && (segment === "participants" || segment === "summary");

  return toItems ? (
    <BackLink href={`/bills/${billId}/items`} label="Voltar para os itens" />
  ) : (
    <BackLink href="/" label="Voltar para suas contas" />
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="icon-lg" className="-ml-2 shrink-0">
      <Link href={href} aria-label={label}>
        <ArrowLeft />
      </Link>
    </Button>
  );
}
