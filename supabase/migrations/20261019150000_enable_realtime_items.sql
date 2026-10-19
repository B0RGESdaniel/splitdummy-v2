-- Enables Supabase Realtime (postgres_changes) for `items`. RLS continues to gate
-- which rows each client receives — no separate realtime-specific policy needed.
alter publication supabase_realtime add table public.items;
