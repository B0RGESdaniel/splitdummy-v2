import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Bypasses RLS entirely. Only use server-side, and only for the narrow,
 * documented cases that can't go through the regular client: resolving an
 * invite token before the user is a participant, serving the public
 * closed-bill share page, and the AI receipt extraction route (which reads
 * private Storage objects).
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
