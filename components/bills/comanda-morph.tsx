"use client";

import { useParams } from "next/navigation";
import { Suspense, ViewTransition, type ReactNode } from "react";

// Envolve uma peça da comanda no nome do morph do balcão, que leva o id da
// conta. O id vem da URL pra peça fazer parte da casca que aparece antes dos
// dados. Na pré-renderização da casca o id ainda não existe e `useParams`
// suspende: o fallback é a mesma peça sem nome de morph. Numa navegação pelo
// cliente (abrir pelo balcão) o id já está na URL e o hook resolve na hora.
export function ComandaMorph({ part, children }: { part: "masthead" | "grade"; children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NamedMorph part={part}>{children}</NamedMorph>
    </Suspense>
  );
}

function NamedMorph({ part, children }: { part: "masthead" | "grade"; children: ReactNode }) {
  const { billId } = useParams<{ billId: string }>();

  return (
    <ViewTransition name={`comanda-${part}-${billId}`} share="comanda-morph" default="none">
      {children}
    </ViewTransition>
  );
}
