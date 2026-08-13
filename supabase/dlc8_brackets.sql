-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 8 — Brackets de torneo (llaves, 3er/4to, campos, historial)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- 1) Amplía tournaments con campos extra:
--      tier             → categoría del torneo (OU, UU, VGC, etc.)
--      max_participants → límite de inscritos
--      bracket_ready    → true cuando se generaron las llaves
--      champion_name / second_name / third_name → ganadores para el historial
-- 2) Crea bracket_matches (cada enfrentamiento de la llave):
--      round    → número de ronda (1 = primera); la final es la última normal
--      position → índice dentro de la ronda
--      match_type → 'standard' | 'bronze' (bronce = partido por el 3er/4to)
--      p1/p2 (id + nombre) → jugadores; winner → 1 o 2 (null = sin decidir)
--      score / notes → resultado y anotaciones (walkover, etc.)
-- Gestión de llaves: solo admin/super-admin (is_admin). Visualización: todos.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Nuevas columnas en tournaments
alter table public.tournaments
  add column if not exists tier              text not null default '',
  add column if not exists max_participants  integer,
  add column if not exists bracket_ready     boolean not null default false,
  add column if not exists champion_name     text not null default '',
  add column if not exists second_name       text not null default '',
  add column if not exists third_name        text not null default '';

-- 2) Tabla de enfrentamientos de la llave
create table if not exists public.bracket_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round         integer not null,
  position      integer not null,
  match_type    text not null default 'standard' check (match_type in ('standard', 'bronze')),
  p1_id         uuid references public.profiles (id) on delete set null,
  p1_name       text not null default '',
  p2_id         uuid references public.profiles (id) on delete set null,
  p2_name       text not null default '',
  winner        integer check (winner in (1, 2)),
  score         text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, round, position)
);

comment on table public.bracket_matches is
  'Llaves de torneo: enfrentamientos por ronda y posición, con ganador y marcador.';

create index if not exists idx_bracket_tournament on public.bracket_matches (tournament_id, round, position);

drop trigger if exists trg_bracket_matches_updated_at on public.bracket_matches;
create trigger trg_bracket_matches_updated_at
  before update on public.bracket_matches
  for each row execute function public.set_updated_at();

alter table public.bracket_matches enable row level security;

drop policy if exists "bracket_matches_select_auth" on public.bracket_matches;
create policy "bracket_matches_select_auth" on public.bracket_matches
  for select using (auth.role() = 'authenticated');

drop policy if exists "bracket_matches_insert_admin" on public.bracket_matches;
create policy "bracket_matches_insert_admin" on public.bracket_matches
  for insert with check (public.is_admin());

drop policy if exists "bracket_matches_update_admin" on public.bracket_matches;
create policy "bracket_matches_update_admin" on public.bracket_matches
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bracket_matches_delete_admin" on public.bracket_matches;
create policy "bracket_matches_delete_admin" on public.bracket_matches
  for delete using (public.is_admin());

-- 3) Realtime: llaves y torneos visibles al instante en pantallas abiertas
do $$
begin
  alter publication supabase_realtime add table public.bracket_matches;
exception
  when duplicate_object then null;
end
$$;
