"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createItem(billId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const unitPrice = Number(formData.get("unit_price"));
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return;
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
    return;
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
