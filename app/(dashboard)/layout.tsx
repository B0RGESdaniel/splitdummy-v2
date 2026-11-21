import { redirect } from "next/navigation";
import { connection } from "next/server";

import { archivoNarrow, bitter, courierPrime, dotGothic16, kalam } from "@/app/fonts";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeScope } from "@/components/theme-scope";
import { redirectIfProfileIncomplete } from "@/lib/auth/profile-gate";
import { createClient } from "@/lib/supabase/server";

// Every route under here is an auth-gated redirect check — it must block
// on the session lookup rather than being prerendered/streamed.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defer to request time before touching cookies()/the Supabase client —
  // without this, Next still attempts a static shell and trips on a
  // synchronous Date.now() call inside the Supabase client's init.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }
  await redirectIfProfileIncomplete(supabase, data.claims.sub, "/");

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
        <main className="flex flex-1 flex-col gap-7 px-5 pt-3 pb-10">{children}</main>
      </div>
    </ThemeScope>
  );
}
