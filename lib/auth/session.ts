import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Leituras por requisição compartilhadas entre layout e página: o React
// `cache` faz cada uma rodar uma vez só no mesmo render, mesmo chamada dos
// dois lados (antes o layout da conta e a página repetiam sessão e conta).

// `connection()` antes do cliente: sem ele o Next tenta pré-renderizar e
// tropeça num Date.now() síncrono dentro do cliente do Supabase.
export const getSupabase = cache(async () => {
  await connection();
  return createClient();
});

export const getUserId = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_key")
    .eq("id", userId)
    .single();
  return data;
});

async function isProfileComplete(userId: string) {
  const profile = await getProfile(userId);
  return !profile || (Boolean(profile.display_name.trim()) && Boolean(profile.avatar_key));
}

/**
 * Portão de entrada das telas logadas: sem sessão vai pro login; sem nome ou
 * avatar (login por e-mail nasce sem nome) passa pelo primeiro acesso e volta
 * pra `next`. Layout e página chamam os dois — as leituras são as mesmas
 * (cache), então redirecionam igual, seja qual for o que terminar primeiro.
 */
export async function requireUser(next: string) {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }
  if (!(await isProfileComplete(userId))) {
    redirect(`/welcome?next=${encodeURIComponent(next)}`);
  }
  return userId;
}
