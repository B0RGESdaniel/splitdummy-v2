import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, cache } from "react";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { JoinSeatPicker } from "@/components/auth/join-seat-picker";
import { SheetCell, SheetGrid, SheetValue } from "@/components/auth/sheet-grid";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { Button } from "@/components/ui/button";
import { getProfile, getUserId } from "@/lib/auth/session";
import { getBillNumber } from "@/lib/bill/bill-number";
import { isAvatarKey } from "@/lib/profile/validate";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ inviteToken: string }>;
type SearchParams = Promise<{ erro?: string }>;

// Convite resolvido via service-role (quem chega pelo link ainda não
// participa da conta, então a RLS não deixaria ler). Uma vez por requisição:
// o Nº do masthead e o conteúdo da folha leem o mesmo convite.
const getInviteBill = cache(async (inviteToken: string) => {
  // Validade do convite é comparada com a hora da requisição.
  await connection();
  const { data: invite } = await createServiceRoleClient()
    .from("bill_invites")
    .select("bill_id, bills(id, name, status, owner_id, created_at, profiles(display_name))")
    .eq("token", inviteToken)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
  return invite?.bills ?? null;
});

// A folha sai na hora, com Conta e Dono ainda em branco; o Nº e o resto do
// convite chegam quando o convite for lido.
export default function JoinPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <BalcaoSheet
      label="Convite"
      number={
        <Suspense fallback="———">
          <JoinBillNumber params={params} />
        </Suspense>
      }
    >
      <Suspense fallback={<BlankBillGrid />}>
        <JoinContent params={params} searchParams={searchParams} />
      </Suspense>
    </BalcaoSheet>
  );
}

function BlankBillGrid() {
  return (
    <SheetGrid>
      <SheetCell label="Conta">
        <SheetValue>&nbsp;</SheetValue>
      </SheetCell>
      <SheetCell label="Dono">
        <SheetValue>&nbsp;</SheetValue>
      </SheetCell>
    </SheetGrid>
  );
}

async function JoinBillNumber({ params }: { params: Params }) {
  const bill = await getInviteBill((await params).inviteToken);
  if (!bill) {
    return "———";
  }
  return String(await getBillNumber(bill.owner_id, bill.created_at)).padStart(3, "0");
}

async function JoinContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { inviteToken } = await params;
  const { erro } = await searchParams;
  const bill = await getInviteBill(inviteToken);
  const userId = await getUserId();
  const fallbackHref = userId ? "/" : "/login";

  if (!bill) {
    return (
      <>
        <p className="text-sm">Esse link de convite não existe, expirou ou foi revogado.</p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </>
    );
  }

  const ownerName = bill.profiles?.display_name || "—";
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
      <>
        {billGrid}
        <p className="text-sm">Essa conta já foi paga e não aceita novos participantes.</p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </>
    );
  }

  if (!userId) {
    return (
      <>
        {billGrid}
        <p className="text-sm">Entre para participar dessa conta.</p>
        <SignInOptions next={`/join/${inviteToken}`} />
      </>
    );
  }

  const [{ data: participants }, profile] = await Promise.all([
    createServiceRoleClient()
      .from("bill_participants")
      .select("id, profile_id, display_name, avatar_key")
      .eq("bill_id", bill.id),
    getProfile(userId),
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
    <>
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
    </>
  );
}
