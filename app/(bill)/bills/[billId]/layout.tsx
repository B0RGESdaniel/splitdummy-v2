import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Bitter, Kalam } from "next/font/google";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { BillRealtimeRefresh } from "@/components/bills/bill-realtime-refresh";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { archivoNarrow } from "@/app/fonts";
import { ThemeScope } from "@/components/theme-scope";
import { createClient } from "@/lib/supabase/server";

// This route group has no shared ancestor with app/(dashboard)/layout.tsx
// (different top-level group, so it gets its own paper-world chrome instead
// of the dashboard's), so it repeats the auth-gate redirect check here.
export const instant = false;

const bitter = Bitter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const kalam = Kalam({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["400", "700"],
});

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
    .select("id, name, owner_id, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const isOwner = userId === bill.owner_id;
  // Conta fechada não aceita mais ninguém (o aceite do convite já recusa),
  // então não há o que compartilhar.
  const canInvite = isOwner && bill.status === "open";

  const [invite, { data: participantRows }] = await Promise.all([
    canInvite ? getOrCreateActiveInvite(billId) : null,
    supabase.from("bill_participants").select("id, profile_id").eq("bill_id", billId),
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
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-1">
              <Button asChild variant="ghost" size="icon-lg" className="-ml-2 shrink-0">
                <Link href="/" aria-label="Voltar para suas contas">
                  <ArrowLeft />
                </Link>
              </Button>
              <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground">
                {bill.name}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              {canInvite && <InviteQrPanel billId={billId} invite={invite} />}
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </div>
    </ThemeScope>
  );
}
