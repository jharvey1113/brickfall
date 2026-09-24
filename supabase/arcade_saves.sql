-- Brickfall: progress that follows each player's name (used by docs/sync.js).
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.arcade_saves (
  player     text primary key,                 -- "group|name", lowercased, e.g. "family|carissa"
  grp        text not null default 'family',
  name       text not null,
  data       jsonb not null default '{}'::jsonb, -- each game's saved progress
  updated_at timestamptz not null default now()
);

alter table public.arcade_saves enable row level security;

-- Same open model as the family leaderboard: anyone with the link can read and save by name.
drop policy if exists "arcade_saves read"   on public.arcade_saves;
drop policy if exists "arcade_saves insert" on public.arcade_saves;
drop policy if exists "arcade_saves update" on public.arcade_saves;
create policy "arcade_saves read"   on public.arcade_saves for select using (true);
create policy "arcade_saves insert" on public.arcade_saves for insert with check (true);
create policy "arcade_saves update" on public.arcade_saves for update using (true) with check (true);

grant select, insert, update on public.arcade_saves to anon, authenticated;
