import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Bypasses RLS entirely. Only use server-side, and only for the narrow,
 * documented cases that can't go through the regular client: resolving an
 * invite token and accepting it (bill_participants inserts are owner-only
 * by RLS, but the joining user isn't a participant — or the owner — yet),
 * and serving the public closed-bill share page. The AI receipt extraction
 * route uses it only to *count* a user's past `receipts` for the rate
 * limit (RLS would hide rows from bills they've since left); the audit row
 * itself is still inserted via the regular RLS-respecting client. The
 * masthead and the Resumo use it only to *count* the owner's bills for the
 * "Nº 003" number (a participant can't see the owner's other bills), via
 * `getBillNumber` in lib/bill/bill-number.ts.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
