-- Phase 0: address security advisor warnings.

-- Pin search_path on the pre-existing updated_at helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is a trigger-only function; do not expose it as an RPC
revoke execute on function public.handle_new_user() from anon, authenticated;
