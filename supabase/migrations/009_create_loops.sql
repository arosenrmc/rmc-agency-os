-- Loops: the cross-cutting command-center module.
-- A "loop" is any open thread that needs tracking, regardless of where it came
-- from (email, Asana, an AI chat, a client, or just your head). Capture is
-- near-zero friction: only a title is required; client/project links and
-- structure are optional and can be added during triage.

create table public.loops (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade not null,
  -- Optional links into the rest of the OS (aggregation, not ownership).
  client_id    uuid references public.clients(id)  on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  title        text not null,
  note         text,
  source       text not null default 'brain'
               check (source in ('brain','email','asana','ai-chat','client','other')),
  source_link  text,
  -- Whose court is the ball in — answers "what's waiting on me vs them".
  waiting_on   text not null default 'me' check (waiting_on in ('me','them')),
  -- captured = raw/untriaged, active = live, done/dropped = closed.
  status       text not null default 'captured'
               check (status in ('captured','active','done','dropped')),
  due_date     date,
  -- Powers "this is rotting" aging highlights. Bumped on any meaningful touch.
  last_touched timestamptz not null default timezone('utc', now()),
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

create index idx_loops_org        on public.loops(org_id);
create index idx_loops_org_status on public.loops(org_id, status);
create index idx_loops_client     on public.loops(client_id);
create index idx_loops_project    on public.loops(project_id);

-- Org-membership RLS, matching the rest of the domain tables (migration 006).
alter table public.loops enable row level security;

create policy "org read loops"   on public.loops for select using (public.is_org_member(org_id));
create policy "org insert loops" on public.loops for insert with check (public.is_org_member(org_id));
create policy "org update loops" on public.loops for update using (public.is_org_member(org_id));
create policy "org delete loops" on public.loops for delete using (public.is_org_member(org_id));

-- Reuse the shared triggers: keep updated_at fresh, and auto-fill org_id from
-- the user's single membership when omitted (migrations 001 / 008).
create trigger update_loops_updated_at
  before update on public.loops
  for each row execute function public.update_updated_at_column();

create trigger set_org_id_loops
  before insert on public.loops
  for each row execute function public.set_org_id_from_membership();
