"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createBill(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/bills/new");
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({ name, owner_id: userId })
    .select("id")
    .single();

  if (billError) {
    throw new Error(billError.message);
  }

  const { error: participantError } = await supabase
    .from("bill_participants")
    .insert({ bill_id: bill.id, profile_id: userId });

  if (participantError) {
    throw new Error(participantError.message);
  }

  revalidatePath("/");
  redirect("/");
}
