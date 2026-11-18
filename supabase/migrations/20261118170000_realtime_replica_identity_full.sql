-- ============================================================
-- items e item_shares com replica identity full
--
-- O Realtime só aplica filtro (`bill_id=eq.<id>`) a eventos DELETE
-- quando a tabela tem `replica identity full`. No padrão, a linha
-- antiga do DELETE só traz a chave primária, o filtro por `bill_id`
-- nunca casa e o evento não chega a ninguém. Na prática, excluir um
-- item (ou "substituir tudo" na leitura de cupom) só aparecia pros
-- outros participantes depois de recarregar.
--
-- Efeito colateral aceito: o Realtime não aplica RLS a eventos DELETE,
-- então quem assinar o canal com o id da conta recebe a linha
-- excluída. O id da conta é um UUID que só participantes conhecem.
-- ============================================================

alter table public.items replica identity full;
alter table public.item_shares replica identity full;
