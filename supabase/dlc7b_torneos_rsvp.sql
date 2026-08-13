-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 7b — Inscripción a torneos (RSVP)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Igual que event_rsvps (DLC 7) pero para torneos: cada miembro se inscribe
-- una sola vez por torneo (unique(tournament_id, user_id)).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.tournament_rsvps (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);

comment on table public.tournament_rsvps is
  'Inscripciones de los miembros a los torneos del clan.';

create index if not exists idx_tournament_rsvps_tournament on public.tournament_rsvps (tournament_id);
create index if not exists idx_tournament_rsvps_user on public.tournament_rsvps (user_id);

alter table public.tournament_rsvps enable row level security;

drop policy if exists "trsvps_select_auth" on public.tournament_rsvps;
create policy "trsvps_select_auth" on public.tournament_rsvps
  for select using (auth.role() = 'authenticated');

drop policy if exists "trsvps_insert_own" on public.tournament_rsvps;
create policy "trsvps_insert_own" on public.tournament_rsvps
  for insert with check (auth.uid() = user_id);

drop policy if exists "trsvps_delete_own" on public.tournament_rsvps;
create policy "trsvps_delete_own" on public.tournament_rsvps
  for delete using (auth.uid() = user_id);

-- Realtime: la lista de inscritos se actualiza en vivo
do $$
begin
  alter publication supabase_realtime add table public.tournament_rsvps;
exception
  when duplicate_object then null;
end
$$;
