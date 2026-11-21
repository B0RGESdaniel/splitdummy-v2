"use server";

import { redirect } from "next/navigation";

import { MAX_FIRST_NAME_LENGTH } from "@/lib/auth/first-name";
import { safeNextPath } from "@/lib/auth/safe-next";
import { isAvatarKey, normalizeFirstName } from "@/lib/profile/validate";
import { createClient } from "@/lib/supabase/server";

export type CompleteProfileState = { error: string } | null;

export async function completeProfile(
  _previous: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  const firstName = normalizeFirstName(String(formData.get("display_name") ?? ""));
  const avatarKey = String(formData.get("avatar_key") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!firstName) {
    return { error: `Diga como te chamam, com até ${MAX_FIRST_NAME_LENGTH} letras.` };
  }
  if (!isAvatarKey(avatarKey)) {
    return { error: "Escolha um avatar." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: firstName, avatar_key: avatarKey })
    .eq("id", userId);

  if (error) {
    return { error: "Não deu pra salvar. Tente de novo." };
  }

  redirect(next);
}
