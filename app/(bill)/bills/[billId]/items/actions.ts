"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createItem(billId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const unitPrice = Number(formData.get("unit_price"));
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Preencha a descrição e um preço válido.");
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

  if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Preencha a descrição e um preço válido.");
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
      share_type: "parts",
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
