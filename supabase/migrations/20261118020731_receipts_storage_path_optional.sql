-- ============================================================
-- receipts.storage_path vira opcional
--
-- Fase 2 (IA de leitura de cupom) decidiu nunca persistir a foto do
-- cupom em lugar nenhum — nem Storage, nem disco. Ela existe só em
-- memória durante a chamada à IA e é descartada depois. `receipts`
-- continua existindo como registro de auditoria da extração
-- (ai_raw_result, ai_model, status), só que sem foto associada —
-- storage_path nunca é preenchido por essa linha de produto, mas a
-- coluna fica reservada pra um eventual "salvar a foto original"
-- opcional no futuro, por isso não foi removida.
-- ============================================================

alter table public.receipts
  alter column storage_path drop not null;
