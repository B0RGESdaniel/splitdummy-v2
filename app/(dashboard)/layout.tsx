import { Suspense } from "react";

import { archivoNarrow, bitter, courierPrime, dotGothic16, kalam } from "@/app/fonts";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeScope } from "@/components/theme-scope";
import { requireUser } from "@/lib/auth/session";

// O topo do balcão (marca + Desconectar) não espera o login: sai na hora, e o
// portão de login/perfil roda num <Suspense> à parte. A página repete o
// portão (mesmas leituras em cache) e, ela sim, espera os dados — de
// propósito, pra comanda que volta da conta ter onde encolher (morph).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O balcão: papéis da comanda (Archivo/Kalam/Bitter) e do cupom (Courier/
  // DotGothic16) lado a lado, cada um na própria voz.
  return (
    <ThemeScope
      className={`${archivoNarrow.variable} ${bitter.variable} ${kalam.variable} ${courierPrime.variable} ${dotGothic16.variable} paper-check balcao flex flex-1 flex-col items-center`}
    >
      <div className="flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-1">
          {/* Nome da casa: o que vem impresso em toda comanda do bloco. */}
          <BrandWordmark className="text-xl" />
          <SignOutButton className="text-[color:var(--balcao-soft)] hover:bg-[color:var(--balcao-ink)]/10 hover:text-[color:var(--balcao-ink)]" />
        </header>
        <Suspense fallback={null}>
          <DashboardGate />
        </Suspense>
        <main className="flex flex-1 flex-col gap-7 px-5 pt-3 pb-10">{children}</main>
      </div>
    </ThemeScope>
  );
}

async function DashboardGate() {
  await requireUser("/");
  return null;
}
