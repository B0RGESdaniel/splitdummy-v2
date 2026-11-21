import { redirect } from "next/navigation";

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Nome e avatar são obrigatórios: é o que aparece na mesa e no cupom. Login
// por e-mail nasce sem nome, e perfis antigos podem não ter avatar — os dois
// passam pela tela de primeiro acesso antes de entrar no app.
export async function redirectIfProfileIncomplete(
  supabase: ServerClient,
  userId: string,
  next: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_key")
    .eq("id", userId)
    .single();

  if (profile && (!profile.display_name.trim() || !profile.avatar_key)) {
    redirect(`/welcome?next=${encodeURIComponent(next)}`);
  }
}
