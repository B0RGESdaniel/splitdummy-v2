-- ============================================================
-- Confirmar itens lidos do cupom numa transação só
--
-- "Substituir tudo" fazia DELETE dos itens e depois INSERT dos novos em
-- comandos separados. Cada linha gera um evento de Realtime, cada evento
-- dispara um refetch da lista, e esses refetches caíam no meio do caminho:
-- os participantes viam estados intermediários (parte dos itens antigos
-- sumida, parte dos novos ainda por vir). Numa função, apagar + inserir +
-- marcar o cupom como revisado é uma transação: os eventos só saem depois
-- do commit, e todo refetch já vê a lista final.
--
-- `security invoker`: roda com as permissões de quem chamou, então as
-- políticas de RLS de `items`/`receipts` continuam valendo (participante,
-- conta aberta, `created_by` = quem chamou). Se alguma falhar, nada é
-- gravado.
--
-- `created_at` ganha 1µs por posição: na mesma transação `now()` é igual
-- pra todas as linhas, e a lista é ordenada por `created_at` — sem isso a
-- ordem do cupom se perderia.
-- ============================================================

create or replace function public.confirm_receipt_items (
  p_bill_id uuid,
  p_receipt_id uuid,
  p_items jsonb,
  p_replace boolean
)
returns setof public.items
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_replace then
    delete from public.items where bill_id = p_bill_id;
  end if;

  return query
  with inserted as (
    insert into public.items (bill_id, description, unit_price, quantity, created_by, created_at)
    select
      p_bill_id,
      item.description,
      item.unit_price,
      item.quantity,
      (select auth.uid ()),
      now() + item.position * interval '1 microsecond'
    from rows from (
      jsonb_to_recordset(p_items) as (description text, unit_price numeric, quantity numeric)
    ) with ordinality as item (description, unit_price, quantity, position)
    returning *
  )
  select * from inserted order by created_at;

  update public.receipts set status = 'reviewed' where id = p_receipt_id;
end;
$$;
