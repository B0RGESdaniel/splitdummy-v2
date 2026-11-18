"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

// Agrupa rajadas de eventos (ex.: vários participantes entrando de uma vez)
// num único refresh.
const REFRESH_DEBOUNCE_MS = 250;

/**
 * Realtime dos dados da conta que vêm de Server Components (conta,
 * participantes, avatares) — diferente de itens/partes, que vivem no
 * TanStack Query (`useRealtimeTable`). Qualquer mudança dispara
 * `router.refresh()`: o servidor busca de novo e as telas recebem props
 * novas, sem duplicar o fetch no cliente.
 *
 * Montado no layout da conta, então cobre Itens, Participantes e Resumo.
 *
 * O canal é assinado uma vez só por conta: os ids de participantes/perfis
 * são lidos por ref, não entram no filtro. Reassinar a cada entrada/saída
 * deixava o canal "cego" por alguns segundos (a assinatura nova demora a
 * ficar ativa no servidor) e perdia o evento de quem entrasse em seguida.
 * Por isso DELETE de `bill_participants` (que já vem sem filtro e só com o
 * `id`, ver `useRealtimeTable`) e UPDATE de `profiles` são assinados sem
 * filtro e comparados com as refs. `profiles` já é legível por qualquer
 * usuário logado pela RLS, então assinar sem filtro não expõe nada novo.
 */
export function BillRealtimeRefresh({
  billId,
  ownParticipantId,
  participantIds,
  profileIds,
}: {
  billId: string;
  ownParticipantId: string | null;
  participantIds: string[];
  profileIds: string[];
}) {
  const router = useRouter();
  const ownParticipantIdRef = useRef(ownParticipantId);
  const participantIdsRef = useRef(participantIds);
  const profileIdsRef = useRef(profileIds);
  useEffect(() => {
    ownParticipantIdRef.current = ownParticipantId;
    participantIdsRef.current = participantIds;
    profileIdsRef.current = profileIds;
  }, [ownParticipantId, participantIds, profileIds]);

  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let removed = false;

    const scheduleRefresh = () => {
      if (removed) {
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`bill-meta:${billId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills", filter: `id=eq.${billId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_participants",
          filter: `bill_id=eq.${billId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "bill_participants" },
        (payload) => {
          const deletedId = payload.old.id;

          if (deletedId === ownParticipantIdRef.current) {
            // Sem acesso à conta a partir daqui (a RLS já esconde tudo);
            // um refresh cairia num 404.
            removed = true;
            clearTimeout(timeout);
            toast("Você não participa mais desta conta.");
            router.replace("/");
            return;
          }

          if (participantIdsRef.current.includes(deletedId)) {
            scheduleRefresh();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (profileIdsRef.current.includes(payload.new.id)) {
            scheduleRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [billId, router]);

  return null;
}
