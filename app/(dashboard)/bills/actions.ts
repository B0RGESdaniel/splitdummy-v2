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

  // The owner is added to bill_participants automatically by the
  // add_bill_owner_as_participant trigger.
  const { error: billError } = await supabase
    .from("bills")
    .insert({ name, owner_id: userId });

  if (billError) {
    throw new Error(billError.message);
  }

  revalidatePath("/");
  redirect("/");
}
