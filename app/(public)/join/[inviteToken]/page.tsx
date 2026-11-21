import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { JoinSeatPicker } from "@/components/auth/join-seat-picker";
import { SheetCell, SheetGrid, SheetValue } from "@/components/auth/sheet-grid";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { Button } from "@/components/ui/button";
import { getBillNumber } from "@/lib/bill/bill-number";
import { isAvatarKey } from "@/lib/profile/validate";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const instant = false;

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await connection();
  const { inviteToken } = await params;
  const { erro } = await searchParams;

  const serviceRole = createServiceRoleClient();
  const { data: invite } = await serviceRole
    .from("bill_invites")
    .select("bill_id, bills(id, name, status, owner_id, created_at, profiles(display_name))")
    .eq("token", inviteToken)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  const bill = invite?.bills;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const fallbackHref = userId ? "/" : "/login";

  if (!bill) {
    return (
      <BalcaoSheet label="Convite inválido">
        <p className="text-sm">Esse link de convite não existe, expirou ou foi revogado.</p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </BalcaoSheet>
    );
  }

  const ownerName = bill.profiles?.display_name || "—";
  const billNumber = await getBillNumber(bill.owner_id, bill.created_at);
  const billGrid = (
    <SheetGrid>
      <SheetCell label="Conta">
        <SheetValue>{bill.name}</SheetValue>
      </SheetCell>
      <SheetCell label="Dono">
        <SheetValue>{ownerName}</SheetValue>
      </SheetCell>
    </SheetGrid>
  );

  if (bill.status !== "open") {
    return (
      <BalcaoSheet label="Convite" number={billNumber}>
        {billGrid}
        <p className="text-sm">Essa conta já foi paga e não aceita novos participantes.</p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </BalcaoSheet>
    );
  }

  if (!userId) {
    return (
      <BalcaoSheet label="Convite" number={billNumber}>
        {billGrid}
        <p className="text-sm">Entre para participar dessa conta.</p>
        <SignInOptions next={`/join/${inviteToken}`} />
      </BalcaoSheet>
    );
  }

  const [{ data: participants }, { data: profile }] = await Promise.all([
    serviceRole
      .from("bill_participants")
      .select("id, profile_id, display_name, avatar_key")
      .eq("bill_id", bill.id),
    supabase.from("profiles").select("display_name, avatar_key").eq("id", userId).single(),
  ]);

  // Já está na mesa (link aberto de novo): vai direto pra conta.
  if (participants?.some((participant) => participant.profile_id === userId)) {
    redirect(`/bills/${bill.id}`);
  }

  const guests = (participants ?? [])
    .filter((participant) => participant.profile_id === null)
    .map((participant) => ({
      id: participant.id,
      name: participant.display_name ?? "",
      avatarKey:
        participant.avatar_key && isAvatarKey(participant.avatar_key) ? participant.avatar_key : null,
    }));

  const profileAvatar =
    profile?.avatar_key && isAvatarKey(profile.avatar_key) ? profile.avatar_key : null;

  return (
    <BalcaoSheet label="Convite" number={billNumber}>
      {erro === "perfil" && (
        <p className="text-destructive text-sm">Confira o nome e o avatar e tente de novo.</p>
      )}
      <JoinSeatPicker
        token={inviteToken}
        billName={bill.name}
        ownerName={ownerName}
        guests={guests}
        profile={{
          name: profile?.display_name ?? "",
          avatarKey: profileAvatar,
          isComplete: Boolean(profile?.display_name.trim() && profileAvatar),
        }}
      />
    </BalcaoSheet>
  );
}
