-- Data-provenance flags (groundwork for the demo-vs-real inspector).
alter table public.clients  add column if not exists is_demo boolean not null default false;
alter table public.projects add column if not exists is_demo boolean not null default false;
alter table public.tasks    add column if not exists is_demo boolean not null default false;

-- Developer-only feedback / annotations captured from the live site.
create table if not exists public.dev_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_url text,
  route text,
  element_selector text,
  element_label text,
  comment text not null,
  screenshot_path text,
  status text not null default 'open' check (status in ('open','building','done','dismissed')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.dev_feedback enable row level security;

create policy "dev_feedback dev select" on public.dev_feedback for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_developer));
create policy "dev_feedback dev insert" on public.dev_feedback for insert
  with check (user_id = auth.uid() and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_developer));
create policy "dev_feedback dev update" on public.dev_feedback for update
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_developer));

create index if not exists dev_feedback_created_idx on public.dev_feedback (created_at desc);

-- Private storage bucket for annotation screenshots.
insert into storage.buckets (id, name, public) values ('dev-feedback', 'dev-feedback', false)
on conflict (id) do nothing;

create policy "dev_feedback storage dev all" on storage.objects for all
  using (bucket_id = 'dev-feedback' and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_developer))
  with check (bucket_id = 'dev-feedback' and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_developer));
