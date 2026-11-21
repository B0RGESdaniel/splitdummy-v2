import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { getUserId } from "@/lib/auth/session";

type SearchParams = Promise<{ next?: string; erro?: string }>;

// A folha sai na hora; quem já está logado é mandado adiante assim que a
// sessão é lida. Enquanto isso, as opções de entrar aparecem travadas (mesma
// altura, sem toque), porque o destino depois do login (`next`) vem da URL.
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <BalcaoSheet label="Entrar">
      <Suspense
        fallback={
          <div inert>
            <SignInOptions />
          </div>
        }
      >
        <LoginOptions searchParams={searchParams} />
      </Suspense>
      <Link
        href="/privacidade"
        className="self-center text-[11px] font-semibold tracking-wide uppercase underline underline-offset-[3px]"
      >
        Política de Privacidade
      </Link>
    </BalcaoSheet>
  );
}

async function LoginOptions({ searchParams }: { searchParams: SearchParams }) {
  const { next, erro } = await searchParams;
  if (await getUserId()) {
    redirect(next ?? "/");
  }

  return (
    <>
      {erro === "link" && (
        <p className="text-destructive text-sm">
          Esse link de login venceu ou já foi usado. Peça um código novo.
        </p>
      )}
      <SignInOptions next={next} />
    </>
  );
}
