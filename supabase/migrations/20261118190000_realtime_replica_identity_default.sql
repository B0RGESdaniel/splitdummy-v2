-- ============================================================
-- Reverte `replica identity full` (20261118170000) — quebrava o Realtime
--
-- A função `realtime.apply_rls` deduz a chave primária da linha a partir
-- do campo `pk` do wal2json, que segue a replica identity da tabela. Com
-- `full` não há índice de identidade, o campo vem vazio, e todo evento
-- de tabela com RLS vira "Error 400: Bad Request, no primary key" —
-- descartado em silêncio pelo cliente. Resultado: nenhum evento chegava
-- a usuário autenticado, nem INSERT/UPDATE.
--
-- E não resolvia o DELETE de qualquer jeito: com RLS, `apply_rls` só
-- repassa a chave primária na linha antiga de um DELETE, então o filtro
-- `bill_id=eq.<id>` nunca casa. A correção real fica no cliente:
-- assinar DELETE sem filtro e reconhecer a linha pelo id
-- (`lib/realtime/use-realtime-table.ts`,
-- `components/bills/bill-realtime-refresh.tsx`).
-- ============================================================

alter table public.items replica identity default;
alter table public.item_shares replica identity default;
alter table public.bills replica identity default;
alter table public.bill_participants replica identity default;
