-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 7 — RSVP: confirmación de asistencia a eventos
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Un miembro confirma una sola vez por evento (unique(event_id, user_id)).
--   event_id → id del evento
--   user_id  → miembro que confirma asistencia
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

comment on table public.event_rsvps is
  'Confirmaciones de asistencia de los miembros a los eventos del clan.';

create index if not exists idx_event_rsvps_event on public.event_rsvps (event_id);
create index if not exists idx_event_rsvps_user on public.event_rsvps (user_id);

alter table public.event_rsvps enable row level security;

drop policy if exists "rsvps_select_auth" on public.event_rsvps;
create policy "rsvps_select_auth" on public.event_rsvps
  for select using (auth.role() = 'authenticated');

drop policy if exists "rsvps_insert_own" on public.event_rsvps;
create policy "rsvps_insert_own" on public.event_rsvps
  for insert with check (auth.uid() = user_id);

drop policy if exists "rsvps_delete_own" on public.event_rsvps;
create policy "rsvps_delete_own" on public.event_rsvps
  for delete using (auth.uid() = user_id);

-- Realtime: la lista de confirmados se actualiza en vivo en todas las pantallas
do $$
begin
  alter publication supabase_realtime add table public.event_rsvps;
exception
  when duplicate_object then null;
end
$$;
