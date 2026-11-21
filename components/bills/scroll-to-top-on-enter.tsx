"use client";

import { useLayoutEffect } from "react";

/**
 * Entrar numa conta começa do topo. O Next mantém a rolagem da tela anterior
 * quando a página nova "ainda aparece" na janela, e o balcão rolado até uma
 * comanda mais embaixo abria a conta rolada, com a grade escondida atrás do
 * masthead fixo. Fica no layout da conta: roda ao entrar nela, não ao
 * trocar entre Itens, Mesa e Resumo.
 */
export function ScrollToTopOnEnter() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
