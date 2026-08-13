-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 9 — Almacén de Builds (pastes/equipos por tier)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Crea la tabla builds + amplía los checks de comments y likes para que las
-- builds puedan tener comentarios y me gusta (parent_type = 'build').
--   tier        → ou | uu | nu | vgc | lc | mono
--   creator_name→ quien creó/comparte la build (puede diferir del autor)
--   paste_url   → enlace al paste del equipo
--   image_url   → imagen de la build (alternativa al enlace)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Comentarios: permitir 'build' (y de paso 'trade' para el DLC 10)
alter table public.comments drop constraint if exists comments_parent_type_check;
alter table public.comments
  add constraint comments_parent_type_check
  check (parent_type in ('tournament', 'event', 'news', 'guide', 'raffle', 'build', 'trade'));

-- 2) Me gusta: permitir 'build' (y de paso 'trade' para el DLC 10)
alter table public.likes drop constraint if exists likes_parent_type_check;
alter table public.likes
  add constraint likes_parent_type_check
  check (parent_type in ('news', 'guide', 'event', 'tournament', 'raffle', 'build', 'trade'));

-- 3) Tabla de builds
create table if not exists public.builds (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  tier         text not null check (tier in ('ou', 'uu', 'nu', 'vgc', 'lc', 'mono')),
  creator_name text not null default '',
  paste_url    text,
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.builds is
  'Almacén de Builds: equipos/pastes publicados por los miembros, por tier.';

create index if not exists idx_builds_tier on public.builds (tier);
create index if not exists idx_builds_author on public.builds (author_id);

drop trigger if exists trg_builds_updated_at on public.builds;
create trigger trg_builds_updated_at
  before update on public.builds
  for each row execute function public.set_updated_at();

alter table public.builds enable row level security;

drop policy if exists "builds_select_auth" on public.builds;
create policy "builds_select_auth" on public.builds
  for select using (auth.role() = 'authenticated');

drop policy if exists "builds_insert_own" on public.builds;
create policy "builds_insert_own" on public.builds
  for insert with check (auth.uid() = author_id);

drop policy if exists "builds_update_own" on public.builds;
create policy "builds_update_own" on public.builds
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "builds_delete_own_or_staff" on public.builds;
create policy "builds_delete_own_or_staff" on public.builds
  for delete using (auth.uid() = author_id or public.is_staff());

-- 4) Realtime: nuevas builds visibles al instante en las pantallas abiertas
do $$
begin
  alter publication supabase_realtime add table public.builds;
exception
  when duplicate_object then null;
end
$$;
