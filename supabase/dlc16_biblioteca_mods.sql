-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 16: Biblioteca de MODs
-- Tabla mods con portada, descripción, enlace de descarga y categorías.
-- Políticas RLS basadas en la matriz de permisos (permiso "content").
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.mods (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  excerpt      text not null default '',
  content      text not null default '',
  categories   text[] not null default '{}',
  tags         text[] not null default '{}',
  image_url    text,
  download_url text,
  author_id    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_mods_updated_at on public.mods;
create trigger trg_mods_updated_at
  before update on public.mods
  for each row execute function public.set_updated_at();

alter table public.mods enable row level security;

-- Lectura: cualquier miembro autenticado
drop policy if exists "mods_select_auth" on public.mods;
create policy "mods_select_auth"
  on public.mods for select
  using (auth.role() = 'authenticated');

-- Escritura: staff con permiso "content" (respetando la matriz de permisos)
drop policy if exists "mods_insert_auth" on public.mods;
create policy "mods_insert_auth"
  on public.mods for insert
  with check (public.has_permission('content'));

drop policy if exists "mods_update_auth" on public.mods;
create policy "mods_update_auth"
  on public.mods for update
  using (public.has_permission('content'));

drop policy if exists "mods_delete_auth" on public.mods;
create policy "mods_delete_auth"
  on public.mods for delete
  using (public.has_permission('content'));
