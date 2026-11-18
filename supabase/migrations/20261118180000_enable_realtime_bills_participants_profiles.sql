-- ============================================================
-- Realtime em bills, bill_participants e profiles
--
-- Fase 3, A3: entrada/saída de participante, taxa de serviço,
-- fechamento da conta e avatar passam a chegar em tempo real pros
-- outros participantes, sem recarregar.
--
-- Sem `replica identity full` (ver 20261118190000): o DELETE de
-- bill_participants é assinado sem filtro e reconhecido pelo id.
-- ============================================================

alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.bill_participants;
alter publication supabase_realtime add table public.profiles;
