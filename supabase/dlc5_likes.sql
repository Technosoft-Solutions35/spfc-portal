-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 5 — Me gusta (Likes) en anuncios de Noticias, Guías, Eventos, Torneos y Sorteos
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente: se puede ejecutar varias veces sin romper nada)
--
-- Tabla de "me gusta": un usuario puede dar like una sola vez a cada contenido.
--   user_id     → usuario que da el like (uuid de profiles)
--   parent_type → tipo de contenido: news | guide | event | tournament | raffle
--   parent_id   → id (uuid) del contenido concreto
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  parent_type text not null check (parent_type in ('news', 'guide', 'event', 'tournament', 'raffle')),
  parent_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, parent_type, parent_id)
);

comment on table public.likes is
  'Me gusta de los miembros sobre anuncios: noticias, guías, eventos, torneos y sorteos.';

create index if not exists idx_likes_parent on public.likes (parent_type, parent_id);
create index if not exists idx_likes_user on public.likes (user_id);

alter table public.likes enable row level security;

drop policy if exists "likes_select_auth" on public.likes;
create policy "likes_select_auth" on public.likes
  for select using (auth.role() = 'authenticated');

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes
  for delete using (auth.uid() = user_id);

-- Activa Realtime para que los contadores de likes se actualicen en vivo
-- en las pantallas abiertas de todos los miembros.
do $$
begin
  alter publication supabase_realtime add table public.likes;
exception
  when duplicate_object then null;
end
$$;
