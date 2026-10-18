-- public.handle_new_user() is SECURITY DEFINER and must only ever run as
-- the auth.users trigger, never be callable directly via PostgREST RPC.
-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- default, so `revoke ... from public` alone (in the init migration) was
-- not enough — revoke those two roles explicitly too.
revoke execute on function public.handle_new_user () from anon, authenticated;
