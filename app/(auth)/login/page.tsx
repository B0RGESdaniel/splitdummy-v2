import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  await connection();
  const { next, erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(next ?? "/");
  }

  return (
    <BalcaoSheet label="Entrar">
      {erro === "link" && (
        <p className="text-destructive text-sm">
          Esse link de login venceu ou já foi usado. Peça um código novo.
        </p>
      )}
      <SignInOptions next={next} />
      <Link
        href="/privacidade"
        className="self-center text-[11px] font-semibold tracking-wide uppercase underline underline-offset-[3px]"
      >
        Política de Privacidade
      </Link>
    </BalcaoSheet>
  );
}
