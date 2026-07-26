-- Single-org convenience: if an insert omits org_id and the user belongs to
-- exactly one org, fill it in. The app sets org_id explicitly once multiple
-- orgs exist (this only fires when org_id is null and membership is unambiguous).
create or replace function public.set_org_id_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare orgs uuid[];
begin
  if new.org_id is null then
    select array_agg(org_id) into orgs from public.memberships where user_id = auth.uid();
    if array_length(orgs, 1) = 1 then
      new.org_id := orgs[1];
    end if;
  end if;
  return new;
end;
$$;

create trigger set_org_id_clients  before insert on public.clients  for each row execute function public.set_org_id_from_membership();
create trigger set_org_id_projects before insert on public.projects for each row execute function public.set_org_id_from_membership();
create trigger set_org_id_tasks    before insert on public.tasks    for each row execute function public.set_org_id_from_membership();
create trigger set_org_id_scans    before insert on public.scans    for each row execute function public.set_org_id_from_membership();

-- Trigger-only helper; not an RPC
revoke execute on function public.set_org_id_from_membership() from anon, authenticated;
