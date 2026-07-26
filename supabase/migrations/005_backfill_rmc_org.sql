-- Phase 0: backfill existing (single-user) data into a default org, then
-- enforce that every domain row belongs to an org.

do $$
declare
  v_org uuid;
  v_user uuid;
begin
  select id into v_user from auth.users where email = 'andrew@rmcmktng.com' limit 1;

  insert into public.organizations (name, slug)
  values ('RMC Creative', 'rmc-creative')
  returning id into v_org;

  insert into public.profiles (id, full_name)
  values (v_user, 'Andrew Rosen')
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.memberships (org_id, user_id, role)
  values (v_org, v_user, 'owner');

  update public.clients  set org_id = v_org where org_id is null;
  update public.projects set org_id = v_org where org_id is null;
  update public.tasks    set org_id = v_org where org_id is null;
  update public.scans    set org_id = v_org where org_id is null;
end $$;

alter table public.clients  alter column org_id set not null;
alter table public.projects alter column org_id set not null;
alter table public.tasks    alter column org_id set not null;
alter table public.scans    alter column org_id set not null;
