-- ============================================================
-- Impede remover a própria linha do dono em bill_participants.
--
-- O dono não tem como "sair" da própria conta (não existe
-- transferência de dono) — se a linha dele for removida, ele perde
-- acesso a tudo que depende de is_bill_participant() (itens, partes,
-- resumo), mesmo continuando owner_id em bills. A saída correta pro
-- dono é fechar/deletar a conta, não remover a própria participação.
-- ============================================================

drop policy "bill_participants_delete_self_or_owner" on public.bill_participants;

create policy "bill_participants_delete_self_or_owner"
on public.bill_participants for delete
to authenticated
using (
  profile_id is distinct from (
    select owner_id from public.bills where id = bill_participants.bill_id
  )
  and (
    profile_id = (select auth.uid ())
    or exists (
      select 1 from public.bills b
      where b.id = bill_id and b.owner_id = (select auth.uid ())
    )
  )
);
