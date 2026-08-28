-- ═══════════════════════════════════════════════════════════════
-- DLC 11 — Team Builder (Creador de Equipos del clan)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Cada miembro guarda sus propios equipos (builds de 6 Pokémon) para
-- poder volver a verlos, editarlos o eliminarlos en cualquier momento.
--   name     → nombre que el usuario le puso al equipo
--   pokemon  → JSONB con el array de los 6 Pokémon (datos del set)
-- RLS: cada usuario solo selecciona/inserta/actualiza/elimina sus equipos.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  name        text not null default 'Equipo sin nombre',
  pokemon     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.teams is
  'Team Builder: equipos de 6 Pokémon guardados por cada miembro del clan.';

create index if not exists idx_teams_author on public.teams (author_id);

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.teams enable row level security;

drop policy if exists "teams_select_own" on public.teams;
create policy "teams_select_own" on public.teams
  for select using (auth.uid() = author_id);

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own" on public.teams
  for insert with check (auth.uid() = author_id);

drop policy if exists "teams_update_own" on public.teams;
create policy "teams_update_own" on public.teams
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "teams_delete_own" on public.teams;
create policy "teams_delete_own" on public.teams
  for delete using (auth.uid() = author_id);
