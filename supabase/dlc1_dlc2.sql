-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 1 + DLC 2 — Perfiles personalizados y reportes de shinies
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente: se puede ejecutar varias veces sin romper nada)
--
-- DLC 1: columnas extra en profiles (ign, affiliation, game_roles, bio)
--         + visualización de perfiles con Hall of Fame.
-- DLC 2: shiny_reports (bandeja) + hall_of_fame (historial aprobado)
--         + RPCs atómicas de aprobación/rechazo + subida de miembros a storage.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DLC 1: COLUMNAS NUEVAS EN PROFILES (todas aditivas y opcionales)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists ign          text;
alter table public.profiles add column if not exists affiliation  text check (affiliation in ('SpFc', 'SpGd'));
alter table public.profiles add column if not exists game_roles   text[] not null default '{}';
alter table public.profiles add column if not exists bio          text check (char_length(bio) <= 200);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DLC 2: TABLA DE REPORTES DE SHINIES
-- status: pending → approved | rejected. El cambio de estado SOLO lo hace la
-- RPC (SECURITY DEFINER); las políticas bloquean al cliente.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.shiny_reports (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  pokemon_name text not null check (pokemon_name <> ''),
  image_url    text not null check (image_url <> ''),   -- evidencia obligatoria
  notes        text not null default '',
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists idx_shiny_reports_status   on public.shiny_reports (status, created_at desc);
create index if not exists idx_shiny_reports_author   on public.shiny_reports (author_id, created_at desc);

comment on table public.shiny_reports is 'Reportes de capturas shiny con foto de evidencia (bandeja de revisión del staff)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DLC 1/2: HALL OF FAME — historial personal de shinies aprobados
-- Solo se inserta desde la RPC de aprobación (nada de escritura directa).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.hall_of_fame (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  pokemon_name text not null,
  image_url    text not null,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_hall_of_fame_user on public.hall_of_fame (user_id, created_at desc);

comment on table public.hall_of_fame is 'Historial personal de shinies aprobados (se muestra en el perfil del usuario)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.shiny_reports enable row level security;
alter table public.hall_of_fame enable row level security;

-- Reportes: el autor ve/edita/cancela los suyos mientras estén pendientes;
-- el staff puede leerlos todos (para la bandeja de revisión).
drop policy if exists "shiny_reports_select" on public.shiny_reports;
create policy "shiny_reports_select" on public.shiny_reports
  for select using (auth.uid() = author_id or public.is_staff());

drop policy if exists "shiny_reports_insert_own" on public.shiny_reports;
create policy "shiny_reports_insert_own" on public.shiny_reports
  for insert with check (auth.uid() = author_id and status = 'pending');

drop policy if exists "shiny_reports_update_own_pending" on public.shiny_reports;
create policy "shiny_reports_update_own_pending" on public.shiny_reports
  for update using (auth.uid() = author_id and status = 'pending')
  with check (auth.uid() = author_id and status = 'pending');

drop policy if exists "shiny_reports_delete_own_pending" on public.shiny_reports;
create policy "shiny_reports_delete_own_pending" on public.shiny_reports
  for delete using (auth.uid() = author_id and status = 'pending');

-- Hall of Fame: lectura autenticada; escritura SOLO vía RPC (sin políticas de escritura).
drop policy if exists "hall_of_fame_select" on public.hall_of_fame;
create policy "hall_of_fame_select" on public.hall_of_fame
  for select using (auth.role() = 'authenticated');

grant select, insert, update, delete on table public.shiny_reports to authenticated;
grant select on table public.hall_of_fame to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC DE APROBACIÓN (atómica, solo staff)
-- En UNA transacción: +1 al ranking, alta en Hall of Fame y cierre del reporte.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.approve_shiny_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.shiny_reports%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.is_staff() then
    raise exception 'Solo el staff puede aprobar reportes';
  end if;

  select * into v_report from public.shiny_reports where id = p_report_id;
  if not found then
    raise exception 'Reporte no encontrado';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Ese reporte ya fue revisado';
  end if;

  update public.profiles
     set shinies = shinies + 1
   where id = v_report.author_id;

  insert into public.hall_of_fame (user_id, pokemon_name, image_url, approved_by)
  values (v_report.author_id, v_report.pokemon_name, v_report.image_url, auth.uid());

  update public.shiny_reports
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_report_id;

  return jsonb_build_object('ok', true, 'user_id', v_report.author_id, 'pokemon', v_report.pokemon_name);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC DE RECHAZO (solo staff)
-- Elimina el reporte Y la foto de evidencia del Storage en un solo paso.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.reject_shiny_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_report public.shiny_reports%rowtype;
  v_path   text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.is_staff() then
    raise exception 'Solo el staff puede rechazar reportes';
  end if;

  select * into v_report from public.shiny_reports where id = p_report_id;
  if not found then
    raise exception 'Reporte no encontrado';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Ese reporte ya fue revisado';
  end if;

  -- Extrae la ruta del objeto Storage a partir de la URL pública:
  -- .../storage/v1/object/public/media/<carpeta>/<archivo>
  v_path := regexp_replace(v_report.image_url, '^.*/object/public/[^/]+/', '');

  delete from storage.objects
   where bucket_id = 'media' and name = v_path;

  update public.shiny_reports
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_report_id;

  return jsonb_build_object('ok', true, 'user_id', v_report.author_id, 'pokemon', v_report.pokemon_name);
end;
$$;

grant execute on function public.approve_shiny_report(uuid) to authenticated;
grant execute on function public.reject_shiny_report(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STORAGE: los miembros suben avatar y evidencia a SU carpeta en "media"
-- Regla: <uid>/...  (el primer segmento de la ruta = id del usuario autenticado).
-- La carpeta general sigue siendo solo-staff (política media_staff_* existente).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "media_user_insert_own" on storage.objects;
create policy "media_user_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_user_update_own" on storage.objects;
create policy "media_user_update_own" on storage.objects
  for update using (
    bucket_id = 'media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_user_delete_own" on storage.objects;
create policy "media_user_delete_own" on storage.objects
  for delete using (
    bucket_id = 'media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. REALTIME: el miembro ve en vivo el estado de sus reportes
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.shiny_reports;
exception when duplicate_object then
  null;
end;
$$;
