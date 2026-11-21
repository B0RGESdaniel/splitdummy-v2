"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Linha do cupom que abre a lista de itens da pessoa. Substitui o <details>
 * nativo pra a abertura ter altura animada (grid-template-rows 0fr → 1fr,
 * do "accordion" do transitions.dev, sem o desfoque): o <details> só anima
 * no Chromium. O cabeçalho recebe `group` com `data-open`, pra seta "ver
 * itens" virar com `group-data-[open=true]:`.
 */
export function ReceiptDisclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="group" data-open={open}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {summary}
      </button>
      <div id={panelId} className="receipt-disclosure-panel" inert={!open}>
        <div className="receipt-disclosure-inner">{children}</div>
      </div>
    </div>
  );
}
