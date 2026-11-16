-- ============================================================
-- Avatar escolhido (mesa de Participantes)
--
-- Conjunto fixo de 4 avatares ilustrados (sem foto, sem upload) que a
-- própria pessoa escolhe ao tocar no próprio lugar na mesa (conta) ou
-- que o dono escolhe na hora de adicionar um convidado sem conta.
--
-- Fica em profiles (reutilizado em toda conta que esse perfil participa)
-- e em bill_participants (único jeito de guardar o avatar de um
-- convidado, que não tem linha em profiles) — mesmo padrão de fallback
-- já usado por display_name: bill_participants.avatar_key primeiro,
-- profiles.avatar_key quando a linha pertence a uma conta.
-- ============================================================

alter table public.profiles
  add column avatar_key text
  check (avatar_key in ('female_1', 'female_2', 'male_1', 'male_2'));

alter table public.bill_participants
  add column avatar_key text
  check (avatar_key in ('female_1', 'female_2', 'male_1', 'male_2'));
