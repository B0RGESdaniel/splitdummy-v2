-- Fixes a bug found while implementing bill creation: `insert ... returning`
-- also enforces the table's SELECT policy on the new row, and right after
-- creating a bill its owner isn't in bill_participants yet, so the old
-- "bills_select_participants" policy rejected the RETURNING clause with
-- "new row violates row-level security policy for table bills".
--
-- Fix: the owner can always see their own bill regardless of participant
-- rows (semantically correct on its own), and a trigger keeps
-- bill_participants in sync automatically for every bill insert so no
-- caller has to remember to add the owner as a participant by hand.

drop policy "bills_select_participants" on public.bills;

create policy "bills_select_owner_or_participant"
on public.bills for select
to authenticated
using (
  owner_id = (select auth.uid ())
  or public.is_bill_participant (id)
);

create function public.add_bill_owner_as_participant()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.bill_participants (bill_id, profile_id)
  values (new.id, new.owner_id);
  return new;
end;
$$;

revoke execute on function public.add_bill_owner_as_participant () from anon, authenticated;

create trigger trg_add_bill_owner_as_participant
after insert on public.bills
for each row
execute function public.add_bill_owner_as_participant ();
