"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function setPartsDelta(
  billId: string,
  itemId: string,
  participantId: string,
  delta: 1 | -1,
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("item_shares")
    .select("parts")
    .eq("item_id", itemId)
    .eq("participant_id", participantId)
    .maybeSingle();

  const nextParts = Math.max(0, (existing?.parts ?? 0) + delta);

  const { error } = await supabase.from("item_shares").upsert(
    {
      item_id: itemId,
      bill_id: billId,
      participant_id: participantId,
      share_type: "parts",
      parts: nextParts,
    },
    { onConflict: "item_id,participant_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items/${itemId}/split`);
}

export async function incrementItemPart(
  billId: string,
  itemId: string,
  participantId: string,
) {
  await setPartsDelta(billId, itemId, participantId, 1);
}

export async function decrementItemPart(
  billId: string,
  itemId: string,
  participantId: string,
) {
  await setPartsDelta(billId, itemId, participantId, -1);
}
