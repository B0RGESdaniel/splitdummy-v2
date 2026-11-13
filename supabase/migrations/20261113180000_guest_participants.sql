-- ============================================================
-- Participantes sem conta ("convidados")
--
-- bill_participants.profile_id passa a ser opcional: o dono pode
-- cadastrar um participante só com um nome (sem login), e essa pessoa
-- pode depois "reivindicar" a própria linha ao entrar pelo link de
-- convite e logar com Google.
--
-- A policy de insert de bill_participants (bill_participants_insert_owner)
-- já é só-dono e não valida nada sobre profile_id, então nenhuma RLS
-- precisa mudar pra permitir isso.
-- ============================================================

alter table public.bill_participants
  add column id uuid not null default gen_random_uuid();

alter table public.bill_participants drop constraint bill_participants_pkey;
alter table public.bill_participants add primary key (id);

alter table public.bill_participants alter column profile_id drop not null;
alter table public.bill_participants add column display_name text;

alter table public.bill_participants
  add constraint bill_participants_identity_check
  check (profile_id is not null or display_name is not null);

-- Substitui a antiga PK composta como guarda-anti-duplicata: um profile_id
-- não pode aparecer duas vezes na mesma conta, mas várias linhas de
-- convidado (profile_id null) convivem sem problema.
create unique index bill_participants_bill_profile_unique
  on public.bill_participants (bill_id, profile_id)
  where profile_id is not null;

-- ============================================================
-- item_shares passa a apontar pra bill_participants em vez de profiles
-- direto, assim um convidado também pode ter partes atribuídas pelo
-- grupo (RLS de item_shares não referencia profile_id em nenhuma
-- policy, então nada muda ali).
-- ============================================================

alter table public.item_shares
  add column participant_id uuid references public.bill_participants (id) on delete cascade;

update public.item_shares s
set participant_id = bp.id
from public.bill_participants bp
where bp.bill_id = s.bill_id and bp.profile_id = s.profile_id;

alter table public.item_shares alter column participant_id set not null;

alter table public.item_shares
  add constraint item_shares_item_id_participant_id_key unique (item_id, participant_id);

create index item_shares_participant_id_idx on public.item_shares (participant_id);

-- Dropar a coluna já leva com ela a FK, o unique(item_id, profile_id) e o
-- índice antigos, que dependiam só dela.
alter table public.item_shares drop column profile_id;
