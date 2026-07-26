-- Phase 0: swap user-scoped RLS for org-membership RLS.

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;

create policy "org members read" on public.organizations
  for select using (public.is_org_member(id));

-- Simple predicate (no is_org_member) so there is no RLS recursion on memberships
create policy "read own memberships" on public.memberships
  for select using (user_id = auth.uid());

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

-- Replace the old user_id-scoped policies on domain tables
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('clients','projects','tasks','scans')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "org read clients"   on public.clients for select using (public.is_org_member(org_id));
create policy "org insert clients" on public.clients for insert with check (public.is_org_member(org_id));
create policy "org update clients" on public.clients for update using (public.is_org_member(org_id));
create policy "org delete clients" on public.clients for delete using (public.is_org_member(org_id));

create policy "org read projects"   on public.projects for select using (public.is_org_member(org_id));
create policy "org insert projects" on public.projects for insert with check (public.is_org_member(org_id));
create policy "org update projects" on public.projects for update using (public.is_org_member(org_id));
create policy "org delete projects" on public.projects for delete using (public.is_org_member(org_id));

create policy "org read tasks"   on public.tasks for select using (public.is_org_member(org_id));
create policy "org insert tasks" on public.tasks for insert with check (public.is_org_member(org_id));
create policy "org update tasks" on public.tasks for update using (public.is_org_member(org_id));
create policy "org delete tasks" on public.tasks for delete using (public.is_org_member(org_id));

create policy "org read scans"   on public.scans for select using (public.is_org_member(org_id));
create policy "org insert scans" on public.scans for insert with check (public.is_org_member(org_id));
create policy "org delete scans" on public.scans for delete using (public.is_org_member(org_id));
