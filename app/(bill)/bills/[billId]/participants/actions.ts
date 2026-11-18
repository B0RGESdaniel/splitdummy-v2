"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AVATAR_KEYS, type AvatarKey } from "@/components/bills/avatar-icon";
import { createClient } from "@/lib/supabase/server";

function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as string[]).includes(value);
}

export async function addGuestParticipant(billId: string, formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarKey = String(formData.get("avatar_key") ?? "");

  if (!displayName) {
    throw new Error("Nome é obrigatório.");
  }

  if (!isAvatarKey(avatarKey)) {
    throw new Error("Avatar inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bill_participants")
    .insert({ bill_id: billId, display_name: displayName, avatar_key: avatarKey });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/participants`);
}

export async function setOwnAvatar(billId: string, formData: FormData) {
  const avatarKey = String(formData.get("avatar_key") ?? "");

  if (!isAvatarKey(avatarKey)) {
    throw new Error("Avatar inválido.");
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    throw new Error("Não autenticado.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_key: avatarKey })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/participants`);
}

export async function removeParticipant(billId: string, participantId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  // Lido antes do delete: depois dele, a RLS já não deixa quem saiu ver a linha.
  const { data: participant } = await supabase
    .from("bill_participants")
    .select("profile_id")
    .eq("id", participantId)
    .maybeSingle();

  const { error } = await supabase
    .from("bill_participants")
    .delete()
    .eq("id", participantId);

  if (error) {
    throw new Error(error.message);
  }

  // Autorremoção: a conta deixa de ser visível pra quem saiu, então
  // revalidar a página dela cairia num 404.
  if (userId && participant?.profile_id === userId) {
    redirect("/");
  }

  revalidatePath(`/bills/${billId}/participants`);
}
