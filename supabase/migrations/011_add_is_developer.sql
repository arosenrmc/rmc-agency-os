-- Platform-level developer flag on profiles (separate axis from org role).
-- Gates all dev-only tooling (dev footer, feedback tool).
alter table public.profiles
  add column if not exists is_developer boolean not null default false;
