import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { BillBackButton } from "@/components/bills/bill-back-button";
import { ComandaMorph } from "@/components/bills/comanda-morph";
import { BrandWordmark } from "@/components/brand-wordmark";
import { BillRealtimeRefresh } from "@/components/bills/bill-realtime-refresh";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { ScrollToTopOnEnter } from "@/components/bills/scroll-to-top-on-enter";
import { archivoNarrow, bitter, kalam } from "@/app/fonts";
import { ThemeScope } from "@/components/theme-scope";
import { requireUser } from "@/lib/auth/session";
import { getBillNumber } from "@/lib/bill/bill-number";
import { getBill, getBillParticipantRows } from "@/lib/bill/bill-queries";

// Barra do sistema na cor do papel (`--background` do `.paper-check`).
export const viewport: Viewport = {
  themeColor: "#f9f4ee",
};

type Params = Promise<{ billId: string }>;

// A casca da conta (papel, masthead impresso, ←) não espera nada: sai na hora
// e as partes que dependem da sessão e da conta chegam cada uma no seu
// <Suspense>. O portão de login/perfil roda aqui e em cada página (mesmas
// leituras em cache), porque este grupo de rota não divide layout com o
// dashboard e a página não pode depender de o layout ter barrado antes.
export default function BillLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  return (
    <ThemeScope
      className={`${bitter.variable} ${kalam.variable} ${archivoNarrow.variable} paper-check flex flex-1 flex-col items-center bg-background text-foreground`}
    >
      <ScrollToTopOnEnter />
      <Suspense fallback={null}>
        <BillRealtime params={params} />
      </Suspense>
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* A casa é o Divide/ai: o masthead só traz o que vem impresso (nome
            da casa e Nº). O nome da conta é campo preenchido à mão e mora na
            grade de campos de Itens, como a primeira linha (ver items/page.tsx). */}
        <header className="sticky top-0 z-10 border-b-[1.5px] border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <Suspense fallback={<BillBackButton />}>
                <BackButton params={params} />
              </Suspense>
              <ComandaMorph part="masthead">
                <span className="flex items-baseline gap-2">
                  <BrandWordmark className="text-lg" />
                  <span className="text-[11px] font-semibold tracking-[0.08em] tabular-nums">
                    Nº{" "}
                    <Suspense fallback="———">
                      <BillNumber params={params} />
                    </Suspense>
                  </span>
                </span>
              </ComandaMorph>
            </div>
            {/* Desconectar fica só no histórico: aqui, ao lado do nome da
                conta, o ícone era lido como "sair desta conta". */}
            <Suspense fallback={null}>
              <InviteSlot params={params} />
            </Suspense>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </div>
    </ThemeScope>
  );
}

async function loadBill(params: Params) {
  const { billId } = await params;
  const userId = await requireUser(`/bills/${billId}`);
  const bill = await getBill(billId);
  if (!bill) {
    notFound();
  }
  return { billId, userId, bill };
}

async function BackButton({ params }: { params: Params }) {
  const { bill } = await loadBill(params);
  return <BillBackButton isOpen={bill.status === "open"} />;
}

async function BillNumber({ params }: { params: Params }) {
  const { bill } = await loadBill(params);
  const billNumber = await getBillNumber(bill.owner_id, bill.created_at);
  return String(billNumber).padStart(3, "0");
}

// Conta fechada não aceita mais ninguém (o aceite do convite já recusa),
// então não há o que compartilhar.
async function InviteSlot({ params }: { params: Params }) {
  const { billId, userId, bill } = await loadBill(params);
  if (userId !== bill.owner_id || bill.status !== "open") {
    return null;
  }
  const invite = await getOrCreateActiveInvite(billId);
  return <InviteQrPanel billId={billId} invite={invite} />;
}

async function BillRealtime({ params }: { params: Params }) {
  const { billId, userId } = await loadBill(params);
  const participants = await getBillParticipantRows(billId);
  const ownParticipantId =
    participants.find((row) => row.profile_id === userId)?.id ?? null;
  const participantIds = participants.map((row) => row.id).sort();
  // Convidados sem conta (profile_id nulo) não têm avatar em `profiles`.
  const profileIds = participants
    .map((row) => row.profile_id)
    .filter((id): id is string => id !== null)
    .sort();

  return (
    <BillRealtimeRefresh
      billId={billId}
      ownParticipantId={ownParticipantId}
      participantIds={participantIds}
      profileIds={profileIds}
    />
  );
}
