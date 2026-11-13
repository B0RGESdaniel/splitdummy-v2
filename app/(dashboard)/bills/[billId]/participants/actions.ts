"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function addGuestParticipant(billId: string, formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    throw new Error("Nome é obrigatório.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bill_participants")
    .insert({ bill_id: billId, display_name: displayName });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/participants`);
}

export async function removeParticipant(billId: string, participantId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bill_participants")
    .delete()
    .eq("id", participantId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/participants`);
}
