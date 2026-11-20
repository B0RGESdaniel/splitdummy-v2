import { cache } from "react";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Número da conta = posição dela entre as contas do dono ("Nº 007"). Usado
 * no masthead e no cupom do Resumo. Service-role porque um participante não
 * enxerga (por RLS) as outras contas do dono; só a contagem sai daqui, e
 * quem chama já leu a conta via RLS. `cache` evita contar duas vezes no
 * mesmo request (layout + Resumo).
 */
export const getBillNumber = cache(async (ownerId: string, createdAt: string) => {
  const { count } = await createServiceRoleClient()
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .lte("created_at", createdAt);
  return count ?? 1;
});
