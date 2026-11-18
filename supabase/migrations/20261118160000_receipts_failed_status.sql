-- ============================================================
-- receipts ganha o status 'failed'
--
-- Fase 3, A1 (proteção da rota de IA): `receipts` passa a servir
-- também de contador pro teto de leituras (5 por conta, 20 por
-- usuário em 24h). Pra isso, a linha é gravada *antes* de chamar a
-- IA — uma chamada que falha (foto ilegível, erro do modelo) também
-- gasta token e precisa contar. 'failed' marca essas linhas, que
-- nunca chegam à revisão humana.
-- ============================================================

alter table public.receipts
  drop constraint receipts_status_check,
  add constraint receipts_status_check
    check (status in ('pending', 'reviewed', 'discarded', 'failed'));
