"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createBill(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // The owner is added to bill_participants automatically by the
  // add_bill_owner_as_participant trigger.
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({ name, owner_id: userId })
    .select("id")
    .single();

  if (billError) {
    throw new Error(billError.message);
  }

  revalidatePath("/");
  redirect(`/bills/${bill.id}`);
}

export async function createInvite(billId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("bill_invites")
    .insert({ bill_id: billId, created_by: userId });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}`);
}

export async function getOrCreateActiveInvite(billId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("bill_invites")
    .select("id, token")
    .eq("bill_id", billId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    return null;
  }

  const { data: created, error } = await supabase
    .from("bill_invites")
    .insert({ bill_id: billId, created_by: userId })
    .select("id, token")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return created;
}

export async function closeBill(billId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bills")
    .update({ status: "closed" })
    .eq("id", billId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}`);
  revalidatePath(`/bills/${billId}/summary`);
}

export async function regenerateInvite(billId: string, inviteId: string) {
  const supabase = await createClient();

  const { error: revokeError } = await supabase
    .from("bill_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  await createInvite(billId);
}
