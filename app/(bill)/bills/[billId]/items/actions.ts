"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { MAX_ITEM_DESCRIPTION_LENGTH } from "@/lib/bill/item-description";
import { createClient } from "@/lib/supabase/server";

export async function createItem(billId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const unitPrice = Number(formData.get("unit_price"));
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!description || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error("Preencha a descrição e um preço válido.");
  }

  if (description.length > MAX_ITEM_DESCRIPTION_LENGTH) {
    throw new Error(`A descrição pode ter até ${MAX_ITEM_DESCRIPTION_LENGTH} caracteres.`);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { error } = await supabase.from("items").insert({
    bill_id: billId,
    description,
    unit_price: unitPrice,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    created_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

export async function updateItem(
  billId: string,
  itemId: string,
  formData: FormData,
) {
  const description = String(formData.get("description") ?? "").trim();
  const unitPrice = Number(formData.get("unit_price"));
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!description || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error("Preencha a descrição e um preço válido.");
  }

  if (description.length > MAX_ITEM_DESCRIPTION_LENGTH) {
    throw new Error(`A descrição pode ter até ${MAX_ITEM_DESCRIPTION_LENGTH} caracteres.`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({
      description,
      unit_price: unitPrice,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

export async function deleteItem(billId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

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
      parts: nextParts,
    },
    { onConflict: "item_id,participant_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
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

export async function splitItemEqually(billId: string, itemId: string) {
  const supabase = await createClient();

  const { data: participants, error: participantsError } = await supabase
    .from("bill_participants")
    .select("id")
    .eq("bill_id", billId);

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  const { error } = await supabase.from("item_shares").upsert(
    (participants ?? []).map((participant) => ({
      item_id: itemId,
      bill_id: billId,
      participant_id: participant.id,
      parts: 1,
    })),
    { onConflict: "item_id,participant_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

// Zera em vez de apagar: DELETE em item_shares não chega pelo Realtime pros
// outros participantes (ver useRealtimeTable), UPDATE chega.
export async function clearItemParts(billId: string, itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("item_shares")
    .update({ parts: 0 })
    .eq("item_id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

// "Desfazer" do limpar: regrava as partes de antes. Só pra quem ainda está
// na conta — alguém pode ter sido removido entre limpar e desfazer.
export async function restoreItemParts(
  billId: string,
  itemId: string,
  shares: { participant_id: string; parts: number }[],
) {
  const supabase = await createClient();

  const { data: participants, error: participantsError } = await supabase
    .from("bill_participants")
    .select("id")
    .eq("bill_id", billId);

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  const currentIds = new Set((participants ?? []).map((participant) => participant.id));
  const rows = shares
    .filter(
      (share) =>
        currentIds.has(share.participant_id) &&
        Number.isInteger(share.parts) &&
        share.parts >= 0,
    )
    .map((share) => ({
      item_id: itemId,
      bill_id: billId,
      participant_id: share.participant_id,
      parts: share.parts,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("item_shares")
    .upsert(rows, { onConflict: "item_id,participant_id" });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

async function setQuantityDelta(billId: string, itemId: string, delta: 1 | -1) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("items")
    .select("quantity")
    .eq("id", itemId)
    .single();

  const nextQuantity = Math.max(1, (existing?.quantity ?? 1) + delta);

  const { error } = await supabase
    .from("items")
    .update({ quantity: nextQuantity })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}

export async function incrementItemQuantity(billId: string, itemId: string) {
  await setQuantityDelta(billId, itemId, 1);
}

export async function decrementItemQuantity(billId: string, itemId: string) {
  await setQuantityDelta(billId, itemId, -1);
}
