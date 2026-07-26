-- Phase 0: organization (tenancy) foundation.
-- Introduces org/membership/profile model and adds org_id to domain tables.

-- Org role enum
create type public.org_role as enum ('owner','admin','member','client');

-- Organizations (tenants / workspaces)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

-- Profiles (1:1 with auth.users, org-agnostic)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Memberships (who belongs to which org, as what)
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, user_id)
);
create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_org on public.memberships(org_id);

-- Membership check helper. security definer so membership lookups don't
-- recurse through RLS (the classic Supabase multi-tenant footgun).
create or replace function public.is_org_member(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target and user_id = auth.uid()
  );
$$;

-- Add org_id to domain tables (nullable now; backfilled in 005)
alter table public.clients  add column org_id uuid references public.organizations(id) on delete cascade;
alter table public.projects add column org_id uuid references public.organizations(id) on delete cascade;
alter table public.tasks    add column org_id uuid references public.organizations(id) on delete cascade;
alter table public.scans    add column org_id uuid references public.organizations(id) on delete cascade;
create index idx_clients_org  on public.clients(org_id);
create index idx_projects_org on public.projects(org_id);
create index idx_tasks_org    on public.tasks(org_id);
create index idx_scans_org    on public.scans(org_id);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
