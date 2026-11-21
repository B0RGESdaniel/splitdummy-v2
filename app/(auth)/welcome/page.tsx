import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { getProfile, getUserId } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/safe-next";
import { isAvatarKey } from "@/lib/profile/validate";

type SearchParams = Promise<{ next?: string }>;

// Primeiro acesso: nome e avatar, os dois obrigatórios. Quem já tem os dois
// segue direto pro destino. A folha sai na hora; o formulário aparece travado
// até a sessão e o perfil chegarem.
export default function WelcomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <BalcaoSheet label="Primeira vez por aqui">
      <Suspense
        fallback={
          <div inert>
            <WelcomeForm defaultName="" next="/" />
          </div>
        }
      >
        <WelcomeContent searchParams={searchParams} />
      </Suspense>
    </BalcaoSheet>
  );
}

async function WelcomeContent({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath((await searchParams).next);
  const userId = await getUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const profile = await getProfile(userId);

  if (profile?.display_name.trim() && profile.avatar_key) {
    redirect(next);
  }

  return (
    <WelcomeForm
      defaultName={profile?.display_name ?? ""}
      defaultAvatar={profile?.avatar_key && isAvatarKey(profile.avatar_key) ? profile.avatar_key : undefined}
      next={next}
    />
  );
}
