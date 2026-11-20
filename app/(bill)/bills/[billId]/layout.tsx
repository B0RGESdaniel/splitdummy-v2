import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { BillBackButton } from "@/components/bills/bill-back-button";
import { BrandWordmark } from "@/components/brand-wordmark";
import { BillRealtimeRefresh } from "@/components/bills/bill-realtime-refresh";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { archivoNarrow, bitter, kalam } from "@/app/fonts";
import { ThemeScope } from "@/components/theme-scope";
import { getBillNumber } from "@/lib/bill/bill-number";
import { createClient } from "@/lib/supabase/server";

// This route group has no shared ancestor with app/(dashboard)/layout.tsx
// (different top-level group, so it gets its own paper-world chrome instead
// of the dashboard's), so it repeats the auth-gate redirect check here.
export const instant = false;

export default async function BillLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ billId: string }>;
}) {
  await connection();
  const { billId } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    redirect("/login");
  }
  const userId = claims.claims.sub;

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, owner_id, status, created_at")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const isOwner = userId === bill.owner_id;
  // Conta fechada não aceita mais ninguém (o aceite do convite já recusa),
  // então não há o que compartilhar.
  const canInvite = isOwner && bill.status === "open";

  const [invite, { data: participantRows }, billNumber] = await Promise.all([
    canInvite ? getOrCreateActiveInvite(billId) : null,
    supabase.from("bill_participants").select("id, profile_id").eq("bill_id", billId),
    getBillNumber(bill.owner_id, bill.created_at),
  ]);

  const participants = participantRows ?? [];
  const ownParticipantId =
    participants.find((row) => row.profile_id === userId)?.id ?? null;
  const participantIds = participants.map((row) => row.id).sort();
  // Convidados sem conta (profile_id nulo) não têm avatar em `profiles`.
  const profileIds = participants
    .map((row) => row.profile_id)
    .filter((id): id is string => id !== null)
    .sort();

  return (
    <ThemeScope
      className={`${bitter.variable} ${kalam.variable} ${archivoNarrow.variable} paper-check flex flex-1 flex-col items-center bg-background text-foreground`}
    >
      <BillRealtimeRefresh
        billId={billId}
        ownParticipantId={ownParticipantId}
        participantIds={participantIds}
        profileIds={profileIds}
      />
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* A casa é o Divide/ai: o masthead só traz o que vem impresso (nome
            da casa e Nº). O nome da conta é campo preenchido à mão e mora na
            grade de campos de Itens, como a primeira linha (ver items/page.tsx). */}
        <header className="sticky top-0 z-10 border-b-[1.5px] border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <BillBackButton billId={billId} isOpen={bill.status === "open"} />
              <span className="flex items-baseline gap-2">
                <BrandWordmark className="text-lg" />
                <span className="text-[11px] font-semibold tracking-[0.08em] tabular-nums">
                  Nº {String(billNumber).padStart(3, "0")}
                </span>
              </span>
            </div>
            {/* Desconectar fica só no histórico: aqui, ao lado do nome da
                conta, o ícone era lido como "sair desta conta". */}
            {canInvite && <InviteQrPanel billId={billId} invite={invite} />}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </div>
    </ThemeScope>
  );
}
