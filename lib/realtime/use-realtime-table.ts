"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

type Row = Record<string, unknown>;

/**
 * Invalida `queryKey` sempre que `table` mudar (insert/update/delete) para a
 * `billId` em questão. `onChange` (opcional) recebe a linha afetada
 * (`payload.new` ou, em delete, `payload.old`) sem participar da invalidação
 * — usado pelo sinal visual de mudança remota (ver `useRemoteChangeFlash`).
 */
export function useRealtimeTable({
  table,
  billId,
  queryKey,
  onChange,
}: {
  table: string;
  billId: string;
  queryKey: QueryKey;
  onChange?: (row: Row) => void;
}) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`${table}:bill_id=${billId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `bill_id=eq.${billId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyJson) });
          onChangeRef.current?.((payload.new ?? payload.old) as Row);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, billId, queryClient, queryKeyJson]);
}
