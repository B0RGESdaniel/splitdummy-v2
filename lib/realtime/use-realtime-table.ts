"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/** Invalida `queryKey` sempre que `table` mudar (insert/update/delete) para a `billId` em questão. */
export function useRealtimeTable({
  table,
  billId,
  queryKey,
}: {
  table: string;
  billId: string;
  queryKey: QueryKey;
}) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`${table}:bill_id=${billId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `bill_id=eq.${billId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyJson) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, billId, queryClient, queryKeyJson]);
}
