import { cache } from "react";

import { getSupabase } from "@/lib/auth/session";

// Conta e participantes lidos uma vez por requisição, com os campos que o
// layout da conta e as três telas precisam (cada um usa um pedaço).

export const getBill = cache(async (billId: string) => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("bills")
    .select(
      "id, name, status, owner_id, service_tax_percent, created_at, closed_at, profiles(display_name)",
    )
    .eq("id", billId)
    .single();
  return data;
});

export const getBillParticipantRows = cache(async (billId: string) => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("bill_participants")
    .select("id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)")
    .eq("bill_id", billId)
    .order("joined_at", { ascending: true });
  return data ?? [];
});
