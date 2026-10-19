-- Enables Supabase Realtime (postgres_changes) for `item_shares`, so the parts
-- stepper reflects other participants' edits live.
alter publication supabase_realtime add table public.item_shares;
