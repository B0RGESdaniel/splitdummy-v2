"use client";

import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { ViewTransition } from "react";

// Esqueletos de carregamento das telas da conta: a comanda em branco, só com
// o que vem impresso (rótulos e régua) e os campos manuscritos ainda vazios.
// Mesmas medidas das telas de verdade, pra nada pular quando os dados chegam.

const label = "text-[11px] uppercase tracking-wide text-foreground";
// Campo manuscrito vazio: guarda a altura da linha escrita.
const blankField = "translate-y-[5px] font-handwritten text-lg";

function LoadingStatus() {
  return (
    <p role="status" className="sr-only">
      Carregando…
    </p>
  );
}

export function ItemsBlank() {
  const { billId } = useParams<{ billId: string }>();

  return (
    <div className="flex flex-1 flex-col gap-3">
      <LoadingStatus />
      {/* Mesmo nome da grade de items/page.tsx: o morph do balcão chega aqui
          e a grade preenchida entra no lugar dela. */}
      <ViewTransition name={`comanda-grade-${billId}`} share="comanda-morph" default="none">
        <div className="grid grid-cols-[1fr_1fr_0.8fr] border-[1.5px] border-foreground text-xs">
          <div className="col-span-full border-b-[1.5px] border-foreground px-3 pt-1 pb-1.5">
            <div className={label}>Conta</div>
            <div className="translate-y-[5px] font-handwritten text-xl leading-[1.15]">&nbsp;</div>
          </div>
          <div className="border-r-[1.5px] border-foreground px-3 py-2">
            <div className={label}>Dono</div>
            <div className={blankField}>&nbsp;</div>
          </div>
          <div className="border-r-[1.5px] border-foreground px-3 py-2">
            <div className={`flex items-center gap-1 ${label}`}>
              Participantes
              <ChevronRight className="size-3" />
            </div>
            <div className={blankField}>&nbsp;</div>
          </div>
          <div />
        </div>
      </ViewTransition>

      <table
        aria-hidden
        className="w-full table-fixed border-collapse border-[1.5px] border-foreground text-sm"
      >
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-foreground">
            <th className="border-[1.5px] border-foreground px-3 py-2 font-medium">Descrição</th>
            <th className="w-28 border-[1.5px] border-foreground px-3 py-2 text-center font-medium">
              Qtd
            </th>
            <th className="w-14 border-[1.5px] border-foreground px-1 py-2 text-center font-medium">
              Div.
            </th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((row) => (
            <tr key={row} className="h-[3.25rem]">
              <td className="border-[1.5px] border-foreground" />
              <td className="border-[1.5px] border-foreground" />
              <td className="border-[1.5px] border-foreground" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Lugar vazio da mesa: a moldura do avatar e a linha do nome, sem ninguém.
function BlankSeat() {
  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <span className="mb-2 block h-12 w-12 border-2 border-dashed border-foreground opacity-25" />
      <span className="h-4" />
    </div>
  );
}

export function MesaBlank() {
  const rows = 2;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <LoadingStatus />
      <div
        aria-hidden
        className="grid grid-cols-[minmax(3.5rem,1fr)_8rem_minmax(3.5rem,1fr)] items-center justify-center gap-x-4 gap-y-6 py-2"
      >
        <div className="col-span-3 -mb-3 justify-self-center">
          <BlankSeat />
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="contents">
            <div className="mr-2.5 justify-self-end">
              <BlankSeat />
            </div>
            {index === 0 && (
              <div
                className="self-stretch border-[1.5px] border-foreground bg-muted"
                style={{ gridColumn: "2", gridRow: `2 / span ${rows}` }}
              />
            )}
            <div className="ml-2.5 justify-self-start">
              <BlankSeat />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resumo carregando: a boca da impressora, antes de o cupom começar a sair.
export function CupomBlank() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <LoadingStatus />
      <div aria-hidden className="pt-2">
        <div className="receipt-printer" />
      </div>
    </div>
  );
}
