"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

type Row = Record<string, unknown>;

/**
 * Invalida `queryKey` sempre que `table` mudar (insert/update/delete) para a
 * `billId` em questão. `onChange` (opcional) recebe a linha afetada
 * (`payload.new` ou, em delete, `payload.old`) sem participar da invalidação
 * — usado pelo sinal visual de mudança remota (ver `useRemoteChangeFlash`).
 *
 * DELETE é assinado à parte e sem filtro: em tabela com RLS, o Realtime só
 * manda a chave primária da linha excluída, então `bill_id=eq.` nunca casa.
 * Chegam exclusões de qualquer conta; só invalida se o `id` estiver no cache
 * desta consulta. Tabelas cujo cache não guarda `id` (ex.: `item_shares`)
 * dependem da exclusão em cascata do pai (item/participante) pra atualizar.
 *
 * Enquanto houver mutation própria em andamento com `mutationKey` igual a
 * `queryKey`, o eco não invalida: a releitura traria o banco antes dos
 * cliques seguintes e o número otimista "voltaria" por um instante. Quem
 * relê é a última mutation da sequência (ver `invalidateAfterLastMutation`).
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
  onChange?: (row: Row, event: "INSERT" | "UPDATE" | "DELETE") => void;
}) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();

    // Nome do canal inclui a queryKey: `supabase.channel()` devolve o canal
    // existente quando o nome se repete, então duas consultas na mesma tabela
    // (ex.: partes da conta na lista + partes do item no diálogo de dividir)
    // dividiriam um canal só — e fechar o diálogo derrubaria o da lista.
    const channel = supabase
      .channel(`${table}:bill_id=${billId}:${queryKeyJson}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `bill_id=eq.${billId}` },
        (payload) => {
          const key: QueryKey = JSON.parse(queryKeyJson);
          if (queryClient.isMutating({ mutationKey: key }) === 0) {
            queryClient.invalidateQueries({ queryKey: key });
          }
          onChangeRef.current?.((payload.new ?? payload.old) as Row, payload.eventType);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table },
        (payload) => {
          const key: QueryKey = JSON.parse(queryKeyJson);
          const cached = queryClient.getQueryData<unknown>(key);
          const deletedId = payload.old.id;
          const isCached =
            Array.isArray(cached) &&
            cached.some(
              (row: unknown) =>
                typeof row === "object" &&
                row !== null &&
                "id" in row &&
                row.id === deletedId,
            );

          if (isCached) {
            if (queryClient.isMutating({ mutationKey: key }) === 0) {
              queryClient.invalidateQueries({ queryKey: key });
            }
            onChangeRef.current?.(payload.old as Row, "DELETE");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, billId, queryClient, queryKeyJson]);
}

/**
 * `onSettled` das mutations otimistas: relê `queryKey` só quando a última
 * mutation da sequência termina (ela ainda conta como em andamento aqui).
 * Par do `useRealtimeTable`, que ignora o eco enquanto houver alguma.
 */
export function invalidateAfterLastMutation(queryClient: QueryClient, queryKey: QueryKey) {
  if (queryClient.isMutating({ mutationKey: queryKey }) === 1) {
    return queryClient.invalidateQueries({ queryKey });
  }
}
