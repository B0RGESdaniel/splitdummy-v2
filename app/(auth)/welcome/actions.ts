"use server";

import { redirect } from "next/navigation";

import { AVATAR_KEYS, type AvatarKey } from "@/components/bills/avatar-icon";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/auth/first-name";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

export type CompleteProfileState = { error: string } | null;

function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as string[]).includes(value);
}

export async function completeProfile(
  _previous: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  // Só o primeiro nome, como o que vem do Google: é o que cabe na mesa.
  const firstName = String(formData.get("display_name") ?? "").trim().split(/\s+/)[0] ?? "";
  const avatarKey = String(formData.get("avatar_key") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!firstName) {
    return { error: "Diga como te chamam." };
  }
  if (firstName.length > MAX_FIRST_NAME_LENGTH) {
    return { error: `Nome com no máximo ${MAX_FIRST_NAME_LENGTH} letras.` };
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
