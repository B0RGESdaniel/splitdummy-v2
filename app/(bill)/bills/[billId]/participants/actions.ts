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

function participantName(row: {
  display_name: string | null;
  profiles: { display_name: string | null } | null;
}) {
  return (row.display_name ?? row.profiles?.display_name ?? "").trim();
}

function normalizeName(name: string) {
  return name.toLocaleLowerCase("pt-BR");
}

// Copia participantes de outra conta do próprio dono como convidados (sem
// profile_id): quem tem conta Google reivindica o lugar pelo link de convite.
// Os dados de origem são relidos aqui, sem confiar em nome/avatar vindos do
// cliente; quem já está na mesa (mesmo perfil ou mesmo nome) é pulado.
export async function importParticipants(
  billId: string,
  sourceBillId: string,
  sourceParticipantIds: string[],
) {
  if (sourceParticipantIds.length === 0) {
    throw new Error("Selecione ao menos uma pessoa.");
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    throw new Error("Não autenticado.");
  }

  const [{ data: targetBill }, { data: sourceBill }] = await Promise.all([
    supabase
      .from("bills")
      .select("status")
      .eq("id", billId)
      .eq("owner_id", userId)
      .maybeSingle(),
    supabase
      .from("bills")
      .select("id")
      .eq("id", sourceBillId)
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  if (!targetBill || targetBill.status !== "open") {
    throw new Error("Só o dono pode importar participantes numa conta aberta.");
  }

  if (!sourceBill) {
    throw new Error("Conta de origem não encontrada.");
  }

  const participantColumns =
    "id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)";
  const [{ data: sourceRows }, { data: currentRows }] = await Promise.all([
    supabase
      .from("bill_participants")
      .select(participantColumns)
      .eq("bill_id", sourceBillId)
      .in("id", sourceParticipantIds)
      .order("joined_at", { ascending: true }),
    supabase
      .from("bill_participants")
      .select(participantColumns)
      .eq("bill_id", billId),
  ]);

  const currentProfileIds = new Set(
    (currentRows ?? []).flatMap((row) => (row.profile_id ? [row.profile_id] : [])),
  );
  const currentNames = new Set(
    (currentRows ?? []).map((row) => normalizeName(participantName(row))),
  );

  const guests = (sourceRows ?? []).flatMap((row) => {
    const name = participantName(row);
    if (
      !name ||
      row.profile_id === userId ||
      (row.profile_id && currentProfileIds.has(row.profile_id)) ||
      currentNames.has(normalizeName(name))
    ) {
      return [];
    }
    currentNames.add(normalizeName(name));

    return [
      {
        bill_id: billId,
        display_name: name,
        avatar_key: row.avatar_key ?? row.profiles?.avatar_key ?? null,
      },
    ];
  });

  if (guests.length > 0) {
    const { error } = await supabase.from("bill_participants").insert(guests);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/bills/${billId}/participants`);
  return { imported: guests.length };
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
