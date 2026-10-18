import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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

  if (!bill) {
    return (
      <JoinCard title="Convite inválido">
        <p className="text-muted-foreground text-sm">
          Esse link de convite não existe, expirou ou foi revogado.
        </p>
      </JoinCard>
    );
  }

  if (bill.status !== "open") {
    return (
      <JoinCard title={bill.name}>
        <p className="text-muted-foreground text-sm">
          Essa conta já foi fechada e não aceita novos participantes.
        </p>
      </JoinCard>
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    return (
      <JoinCard title={bill.name}>
        <p className="text-muted-foreground text-sm">
          Entre com o Google para participar dessa conta.
        </p>
        <GoogleSignInButton next={`/join/${inviteToken}`} />
      </JoinCard>
    );
  }

  return (
    <JoinCard title={bill.name}>
      <p className="text-muted-foreground text-sm">
        Você foi convidado para participar dessa conta.
      </p>
      <form action="/api/invites/accept" method="POST">
        <input type="hidden" name="token" value={inviteToken} />
        <Button type="submit" className="w-full">
          Entrar na conta
        </Button>
      </form>
    </JoinCard>
  );
}

function JoinCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}
