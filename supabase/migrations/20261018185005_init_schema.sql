-- Splitdummy v2 — initial schema
-- Tables: profiles, groups, group_members, bills, bill_participants,
-- bill_invites, items, item_shares, receipts.
-- RLS is enabled on every table; `public.is_bill_participant()` is the
-- shared predicate for everything scoped to a bill.

-- ============================================================
-- profiles — mirrors auth.users, auto-created on signup
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid ()) = id)
with check ((select auth.uid ()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user () from public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

-- generic "touch updated_at" trigger, reused by items/item_shares below
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- groups / group_members — simple private "quick add" lists
-- ============================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index groups_owner_id_idx on public.groups (owner_id);

alter table public.groups enable row level security;

create policy "groups_all_owner"
on public.groups for all
to authenticated
using ((select auth.uid ()) = owner_id)
with check ((select auth.uid ()) = owner_id);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index group_members_profile_id_idx on public.group_members (profile_id);

alter table public.group_members enable row level security;

create policy "group_members_all_via_group_owner"
on public.group_members for all
to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = (select auth.uid ())
  )
)
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = (select auth.uid ())
  )
);

-- ============================================================
-- bills / bill_participants — the shared "conta" entity
-- ============================================================

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  service_tax_percent numeric(5, 2) not null default 10.00 check (service_tax_percent >= 0),
  share_token uuid unique,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index bills_owner_id_idx on public.bills (owner_id);
create index bills_status_idx on public.bills (status);

alter table public.bills enable row level security;

create table public.bill_participants (
  bill_id uuid not null references public.bills (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (bill_id, profile_id)
);

create index bill_participants_profile_id_idx on public.bill_participants (profile_id);

alter table public.bill_participants enable row level security;

-- Shared predicate: "is the current user a participant of this bill?"
-- SECURITY INVOKER is safe here because bill_participants always grants a
-- user visibility into their own row (see bill_participants_select policy
-- below), so this never recurses past one level of RLS evaluation.
create function public.is_bill_participant(p_bill_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.bill_participants
    where bill_id = p_bill_id and profile_id = (select auth.uid())
  );
$$;

create policy "bills_select_participants"
on public.bills for select
to authenticated
using (public.is_bill_participant (id));

create policy "bills_insert_owner"
on public.bills for insert
to authenticated
with check (owner_id = (select auth.uid ()));

-- Any participant may edit shared fields (e.g. service_tax_percent) while
-- the bill is open; owner_id/status transitions are locked down separately
-- by the protect_bill_lifecycle trigger below.
create policy "bills_update_participants_while_open"
on public.bills for update
to authenticated
using (public.is_bill_participant (id) and status = 'open')
with check (public.is_bill_participant (id));

create policy "bills_delete_owner_while_open"
on public.bills for delete
to authenticated
using (owner_id = (select auth.uid ()) and status = 'open');

create policy "bill_participants_select_self_or_co_participant"
on public.bill_participants for select
to authenticated
using (
  profile_id = (select auth.uid ())
  or public.is_bill_participant (bill_id)
);

-- Direct inserts (e.g. bulk-add from a group) are owner-only; joining via
-- an invite link/QR goes through a service-role route handler instead,
-- since the joining user isn't a participant yet and can't satisfy RLS.
create policy "bill_participants_insert_owner"
on public.bill_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.bills b
    where b.id = bill_id and b.owner_id = (select auth.uid ())
  )
);

create policy "bill_participants_delete_self_or_owner"
on public.bill_participants for delete
to authenticated
using (
  profile_id = (select auth.uid ())
  or exists (
    select 1 from public.bills b
    where b.id = bill_id and b.owner_id = (select auth.uid ())
  )
);

-- Locks down the bill lifecycle: owner_id is immutable, only the owner can
-- flip status, closing is one-way (no reopen), and once closed the row is
-- fully immutable (confirmed product decision — no edits after closing).
create function public.protect_bill_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'bills.owner_id cannot be changed';
  end if;

  if old.status = 'closed' then
    raise exception 'closed bills are immutable';
  end if;

  if new.status <> old.status then
    if (select auth.uid()) <> old.owner_id then
      raise exception 'only the bill owner can change its status';
    end if;
    if new.status = 'closed' then
      new.closed_at := now();
      new.share_token := gen_random_uuid();
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_protect_bill_lifecycle
before update on public.bills
for each row
execute function public.protect_bill_lifecycle ();

-- ============================================================
-- bill_invites — link + QR join flow
-- ============================================================

create table public.bill_invites (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token)
);

create index bill_invites_bill_id_idx on public.bill_invites (bill_id);

alter table public.bill_invites enable row level security;

-- Owner-only. No policy grants anon/authenticated access by token — token
-- resolution for a not-yet-participant user happens in a service-role
-- route handler, never through the regular client.
create policy "bill_invites_all_owner"
on public.bill_invites for all
to authenticated
using (
  exists (
    select 1 from public.bills b
    where b.id = bill_id and b.owner_id = (select auth.uid ())
  )
)
with check (
  exists (
    select 1 from public.bills b
    where b.id = bill_id and b.owner_id = (select auth.uid ())
  )
);

-- ============================================================
-- items
-- ============================================================

create table public.items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  description text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_bill_id_idx on public.items (bill_id);

alter table public.items enable row level security;

create trigger trg_items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at ();

create policy "items_select_participants"
on public.items for select
to authenticated
using (public.is_bill_participant (bill_id));

create policy "items_insert_participants_while_open"
on public.items for insert
to authenticated
with check (
  public.is_bill_participant (bill_id)
  and created_by = (select auth.uid ())
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

create policy "items_update_participants_while_open"
on public.items for update
to authenticated
using (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
)
with check (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

create policy "items_delete_participants_while_open"
on public.items for delete
to authenticated
using (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

-- ============================================================
-- item_shares — generalizes v1's "Part" to parts|percent|fixed
-- ============================================================

create table public.item_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  share_type text not null check (share_type in ('parts', 'percent', 'fixed')),
  parts integer check (parts is null or parts >= 0),
  percent numeric(5, 2) check (percent is null or (percent >= 0 and percent <= 100)),
  fixed_amount numeric(10, 2) check (fixed_amount is null or fixed_amount >= 0),
  updated_at timestamptz not null default now(),
  unique (item_id, profile_id),
  constraint item_shares_one_value_per_type check (
    (share_type = 'parts' and parts is not null and percent is null and fixed_amount is null)
    or (share_type = 'percent' and percent is not null and parts is null and fixed_amount is null)
    or (share_type = 'fixed' and fixed_amount is not null and parts is null and percent is null)
  )
);

create index item_shares_item_id_idx on public.item_shares (item_id);
create index item_shares_bill_id_idx on public.item_shares (bill_id);
create index item_shares_profile_id_idx on public.item_shares (profile_id);

alter table public.item_shares enable row level security;

create trigger trg_item_shares_set_updated_at
before update on public.item_shares
for each row
execute function public.set_updated_at ();

-- Enforces, per item: a single share_type across all participants, percent
-- shares summing to <= 100, and fixed shares summing to <= the item total.
-- Can't be a plain column CHECK since it depends on sibling rows.
create function public.validate_item_share()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unit_price numeric;
  v_quantity numeric;
  v_other_type text;
  v_percent_sum numeric;
  v_fixed_sum numeric;
begin
  select unit_price, quantity into v_unit_price, v_quantity
  from public.items where id = new.item_id;

  select share_type into v_other_type
  from public.item_shares
  where item_id = new.item_id and id <> new.id and share_type <> new.share_type
  limit 1;

  if v_other_type is not null then
    raise exception 'item % already has % shares; clear them before switching to %',
      new.item_id, v_other_type, new.share_type;
  end if;

  if new.share_type = 'percent' then
    select coalesce(sum(percent), 0) into v_percent_sum
    from public.item_shares where item_id = new.item_id;

    if v_percent_sum > 100 then
      raise exception 'item % percent shares exceed 100%% (currently %)', new.item_id, v_percent_sum;
    end if;
  elsif new.share_type = 'fixed' then
    select coalesce(sum(fixed_amount), 0) into v_fixed_sum
    from public.item_shares where item_id = new.item_id;

    if v_fixed_sum > (v_unit_price * v_quantity) then
      raise exception 'item % fixed shares exceed item total (% > %)',
        new.item_id, v_fixed_sum, (v_unit_price * v_quantity);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_item_share
after insert or update on public.item_shares
for each row
execute function public.validate_item_share ();

create policy "item_shares_select_participants"
on public.item_shares for select
to authenticated
using (public.is_bill_participant (bill_id));

create policy "item_shares_insert_participants_while_open"
on public.item_shares for insert
to authenticated
with check (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

create policy "item_shares_update_participants_while_open"
on public.item_shares for update
to authenticated
using (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
)
with check (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

create policy "item_shares_delete_participants_while_open"
on public.item_shares for delete
to authenticated
using (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

-- ============================================================
-- receipts — uploaded photo + AI extraction audit trail
-- ============================================================

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null,
  ai_raw_result jsonb,
  ai_model text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'discarded')),
  created_at timestamptz not null default now()
);

create index receipts_bill_id_idx on public.receipts (bill_id);

alter table public.receipts enable row level security;

create policy "receipts_select_participants"
on public.receipts for select
to authenticated
using (public.is_bill_participant (bill_id));

create policy "receipts_insert_participants_while_open"
on public.receipts for insert
to authenticated
with check (
  public.is_bill_participant (bill_id)
  and uploaded_by = (select auth.uid ())
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);

-- No delete policy: receipts are kept as an audit trail. "Discarding" a
-- receipt is a status update, not a row deletion.
create policy "receipts_update_participants_while_open"
on public.receipts for update
to authenticated
using (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
)
with check (
  public.is_bill_participant (bill_id)
  and exists (select 1 from public.bills b where b.id = bill_id and b.status = 'open')
);
