import { connection } from "next/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { redirectIfProfileIncomplete } from "@/lib/auth/profile-gate";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const instant = false;

export default async function JoinPage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  await connection();
  const { inviteToken } = await params;

  const serviceRole = createServiceRoleClient();
  const { data: invite } = await serviceRole
    .from("bill_invites")
    .select("bill_id, bills(id, name, status)")
    .eq("token", inviteToken)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  const bill = invite?.bills;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const fallbackHref = claims?.claims ? "/" : "/login";

  if (!bill) {
    return (
      <JoinCard>
        <p className="text-muted-foreground text-sm">
          Esse link de convite não existe, expirou ou foi revogado.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </JoinCard>
    );
  }

  if (bill.status !== "open") {
    return (
      <JoinCard billName={bill.name}>
        <p className="text-muted-foreground text-sm">
          Essa conta já foi paga e não aceita novos participantes.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href={fallbackHref}>Voltar</Link>
        </Button>
      </JoinCard>
    );
  }

  if (!claims?.claims) {
    return (
      <JoinCard billName={bill.name}>
        <p className="text-muted-foreground text-sm">
          Entre para participar dessa conta.
        </p>
        <SignInOptions next={`/join/${inviteToken}`} />
      </JoinCard>
    );
  }

  await redirectIfProfileIncomplete(supabase, claims.claims.sub, `/join/${inviteToken}`);

  const { data: unclaimed } = await serviceRole
    .from("bill_participants")
    .select("id, display_name")
    .eq("bill_id", bill.id)
    .is("profile_id", null);

  return (
    <JoinCard billName={bill.name}>
      <p className="text-muted-foreground text-sm">
        {unclaimed && unclaimed.length > 0
          ? "Você é um dos participantes abaixo, ou é novo por aqui?"
          : "Você foi convidado para participar dessa conta."}
      </p>

      {unclaimed && unclaimed.length > 0 && (
        <div className="flex flex-col gap-2">
          {unclaimed.map((participant) => (
            <form key={participant.id} action="/api/invites/accept" method="POST">
              <input type="hidden" name="token" value={inviteToken} />
              <input
                type="hidden"
                name="claim_participant_id"
                value={participant.id}
              />
              <Button type="submit" variant="outline" className="w-full">
                Sou {participant.display_name}
              </Button>
            </form>
          ))}
        </div>
      )}

      <form action="/api/invites/accept" method="POST">
        <input type="hidden" name="token" value={inviteToken} />
        <Button type="submit" className="w-full">
          {unclaimed && unclaimed.length > 0
            ? "Sou um participante novo"
            : "Entrar na conta"}
        </Button>
      </form>
    </JoinCard>
  );
}

function JoinCard({
  billName,
  children,
}: {
  billName?: string;
  children: React.ReactNode;
}) {
  return (
    <BalcaoSheet label={billName ? "Convite" : "Convite inválido"}>
      {billName && (
        // A casa é o Divide/ai: o nome da conta é campo escrito à mão.
        <div>
          <div className="text-[11px] uppercase tracking-wide">Conta</div>
          <div className="font-handwritten text-xl leading-[1.15] break-words text-[color:var(--ink-handwritten)]">
            {billName}
          </div>
        </div>
      )}
      {children}
    </BalcaoSheet>
  );
}
