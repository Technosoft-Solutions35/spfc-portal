-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 10 — Comercio (Ofertas entre miembros del clan)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Crea la tabla trades para publicar ofertas: venta de Pokémon/monedas/ítems,
-- servicios de entrenamiento, crianza (eggs), búsqueda de compra, etc.
--   service_type → venta | entrenamiento | crianza | compra | otro
--   provider_name→ quién ofrece el servicio (IGN, puede diferir del autor)
--   description  → breve descripción / contacto
--   image_url    → imagen de la oferta (adjunto)
--   documents    → lista jsonb [{ name, url }] con archivos adjuntos
--
-- Permisos de borrado: el autor siempre puede borrar; además SOLO los
-- super-admins y admins pueden eliminar ofertas de otros miembros (gestores
-- NO). Para eso usamos is_admin() que cubre super-admin + admin.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Tabla de ofertas de comercio
create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  service_type  text not null check (service_type in ('venta', 'entrenamiento', 'crianza', 'compra', 'otro')),
  provider_name text not null default '',
  description   text not null default '',
  image_url     text,
  documents     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.trades is
  'Comercio del clan: ofertas de venta, entrenamiento, crianza, compra y otros.';

create index if not exists idx_trades_service on public.trades (service_type);
create index if not exists idx_trades_author on public.trades (author_id);

drop trigger if exists trg_trades_updated_at on public.trades;
create trigger trg_trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

alter table public.trades enable row level security;

drop policy if exists "trades_select_auth" on public.trades;
create policy "trades_select_auth" on public.trades
  for select using (auth.role() = 'authenticated');

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades
  for insert with check (auth.uid() = author_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own" on public.trades
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Borrado: el autor, o admin/super-admin (NO gestor). is_admin() = super-admin + admin
drop policy if exists "trades_delete_own_or_admin" on public.trades;
create policy "trades_delete_own_or_admin" on public.trades
  for delete using (auth.uid() = author_id or public.is_admin());

-- 2) Realtime: ofertas nuevas/borradas visibles al instante en pantallas abiertas
do $$
begin
  alter publication supabase_realtime add table public.trades;
exception
  when duplicate_object then null;
end
$$;
