-- AFS Dashboard initial schema
-- Derived from src/App.jsx field usage (the dashboard is the source of truth
-- for what columns must exist; original Supabase project was deleted).

create extension if not exists "pgcrypto";

-- ── afs_teams ─────────────────────────────────────────
create table if not exists public.afs_teams (
  id                     uuid primary key default gen_random_uuid(),
  team_name              text not null,
  city                   text,
  colours                text,
  logo_url               text,
  bio                    text,
  coach_first_name       text,
  coach_last_name        text,
  coach_email            text,
  coach_phone            text,
  coach_position         text,
  coach_dob              date,
  coach_photo_url        text,
  coach_bio              text,
  proof_of_payment_url   text,
  status                 text not null default 'Pending',
  created_at             timestamptz not null default now()
);

create index if not exists afs_teams_created_at_idx on public.afs_teams (created_at desc);

-- ── afs_players ───────────────────────────────────────
create table if not exists public.afs_players (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  dob             date,
  id_number       text,
  photo_url       text,
  height          text,
  weight          text,
  off_position    text,
  def_position    text,
  forty_yard      text,
  vertical        text,
  bench_reps      text,
  broad_jump      text,
  years_playing   text,
  prev_league     text,
  awards          text,
  bio             text,
  team_id         uuid references public.afs_teams(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists afs_players_created_at_idx on public.afs_players (created_at desc);
create index if not exists afs_players_team_id_idx    on public.afs_players (team_id);

-- ── Row Level Security ────────────────────────────────
-- The dashboard (src/App.jsx) reads with the anon key. The public registration form
-- (separate codebase) inserts with the anon key. Tighten this once auth is added.

alter table public.afs_teams   enable row level security;
alter table public.afs_players enable row level security;

create policy "Public can submit team registration"
  on public.afs_teams for insert
  to anon
  with check (true);

create policy "Public can submit player registration"
  on public.afs_players for insert
  to anon
  with check (true);

create policy "Anyone can read teams"
  on public.afs_teams for select
  to anon
  using (true);

create policy "Anyone can read players"
  on public.afs_players for select
  to anon
  using (true);

create policy "Anyone can update teams (dashboard)"
  on public.afs_teams for update
  to anon
  using (true)
  with check (true);

create policy "Anyone can update players (dashboard)"
  on public.afs_players for update
  to anon
  using (true)
  with check (true);

create policy "Anyone can delete teams (dashboard)"
  on public.afs_teams for delete
  to anon
  using (true);

create policy "Anyone can delete players (dashboard)"
  on public.afs_players for delete
  to anon
  using (true);

-- ── Realtime ──────────────────────────────────────────
alter publication supabase_realtime add table public.afs_teams;
alter publication supabase_realtime add table public.afs_players;
