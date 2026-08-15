-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 14 — Matriz de permisos por rol (editable por el super-admin)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query (idempotente).
--
-- Introduce una tabla `role_permissions` (rol → permisos) y la función
-- `has_permission(permiso)` que la consulta. Todas las políticas RLS y los
-- RPC que antes usaban is_staff()/is_admin() pasan a consultar la matriz.
--
-- El super-admin SIEMPRE tiene acceso total (su fila es fija y no se puede
-- editar desde el panel). Asignar roles y entrar al panel de "Roles y
-- Permisos" sigue siendo exclusivo del super-admin (is_super_admin).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Tabla de permisos
create table if not exists public.role_permissions (
  role       text not null check (role in ('super-admin', 'admin', 'gestor', 'member')),
  permission text not null,
  primary key (role, permission)
);

alter table public.role_permissions enable row level security;

-- Lectura para cualquier usuario autenticado (el panel y el contexto la usan);
-- la escritura solo se hace vía el RPC save_role_permissions (security definer).
drop policy if exists "role_permissions_select_auth" on public.role_permissions;
create policy "role_permissions_select_auth" on public.role_permissions
  for select using (auth.role() = 'authenticated');

grant select on table public.role_permissions to authenticated;

-- 2) Función de consulta de permisos (reemplaza a is_staff()/is_admin()
--    en las políticas y RPC de cada módulo)
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    join public.profiles p on p.role = rp.role
    where p.id = auth.uid() and rp.permission = p_permission
  );
$$;

grant execute on function public.has_permission(text) to authenticated;

-- 3) Semilla con el comportamiento actual (idempotente)
insert into public.role_permissions (role, permission)
values
  ('super-admin','content'),      ('super-admin','members'),
  ('super-admin','shinies_review'), ('super-admin','shinies_delete'),
  ('super-admin','brackets'),     ('super-admin','trades'),
  ('super-admin','builds'),       ('super-admin','raffles'),
  ('super-admin','moderate'),
  ('admin','content'),            ('admin','shinies_review'),
  ('admin','brackets'),           ('admin','trades'),
  ('admin','builds'),             ('admin','raffles'),
  ('admin','moderate'),
  ('gestor','content'),           ('gestor','shinies_review'),
  ('gestor','brackets'),          ('gestor','trades'),
  ('gestor','builds'),            ('gestor','moderate')
on conflict do nothing;

-- 4) RPC de guardado (solo super-admin). Nunca toca la fila del super-admin,
--    que se reinserta completa en cada guardado para evitar que alguien
--    (o un fallo) deje al super-admin sin acceso.
create or replace function public.save_role_permissions(p_permissions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role   text;
  v_items  jsonb;
  v_perm   text;
  v_allowed text[] := array[
    'content','members','shinies_review','shinies_delete',
    'brackets','trades','builds','raffles','moderate'
  ];
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.is_super_admin() then
    raise exception 'Solo el super-admin puede editar permisos';
  end if;

  delete from public.role_permissions where role <> 'super-admin';

  insert into public.role_permissions (role, permission)
  select 'super-admin', y from unnest(v_allowed) y
  on conflict do nothing;

  for v_role, v_items in select * from jsonb_each(p_permissions) loop
    if v_role not in ('admin', 'gestor', 'member') then
      raise exception 'Rol no permitido en la matriz: %', v_role;
    end if;
    for v_perm in select jsonb_array_elements_text(v_items) loop
      if not (v_perm = any(v_allowed)) then
        raise exception 'Permiso desconocido: %', v_perm;
      end if;
      insert into public.role_permissions (role, permission)
      values (v_role, v_perm)
      on conflict do nothing;
    end loop;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_role_permissions(jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Políticas RLS → matriz de permisos
-- ─────────────────────────────────────────────────────────────────────────────

-- Contenido (Noticias)
drop policy if exists "news_insert_staff" on public.news;
create policy "news_insert_staff" on public.news
  for insert with check (public.has_permission('content'));
drop policy if exists "news_update_staff" on public.news;
create policy "news_update_staff" on public.news
  for update using (public.has_permission('content'));
drop policy if exists "news_delete_staff" on public.news;
create policy "news_delete_staff" on public.news
  for delete using (public.has_permission('content'));

-- Contenido (Eventos)
drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin" on public.events
  for insert with check (public.has_permission('content'));
drop policy if exists "events_update_admin" on public.events;
create policy "events_update_admin" on public.events
  for update using (public.has_permission('content'));
drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin" on public.events
  for delete using (public.has_permission('content'));

-- Contenido (Torneos)
drop policy if exists "tournaments_insert_admin" on public.tournaments;
create policy "tournaments_insert_admin" on public.tournaments
  for insert with check (public.has_permission('content'));
drop policy if exists "tournaments_update_admin" on public.tournaments;
create policy "tournaments_update_admin" on public.tournaments
  for update using (public.has_permission('content'));
drop policy if exists "tournaments_delete_admin" on public.tournaments;
create policy "tournaments_delete_admin" on public.tournaments
  for delete using (public.has_permission('content'));

-- Contenido (Guías)
drop policy if exists "guides_insert_admin" on public.guides;
create policy "guides_insert_admin" on public.guides
  for insert with check (public.has_permission('content'));
drop policy if exists "guides_update_admin" on public.guides;
create policy "guides_update_admin" on public.guides
  for update using (public.has_permission('content'));
drop policy if exists "guides_delete_admin" on public.guides;
create policy "guides_delete_admin" on public.guides
  for delete using (public.has_permission('content'));

-- Comentarios (moderación: borrar ajenos)
drop policy if exists "comments_delete_staff" on public.comments;
create policy "comments_delete_staff" on public.comments
  for delete using (public.has_permission('moderate'));

-- Perfiles: el staff corrige contadores (shinies_review) o gestiona miembros
drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff" on public.profiles
  for update using (public.has_permission('members') or public.has_permission('shinies_review'));
-- Perfiles: borrar miembros (gestión de miembros)
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.has_permission('members'));

-- Sorteos (tickets + historial)
drop policy if exists "tickets_insert_admin" on public.tickets;
create policy "tickets_insert_admin" on public.tickets
  for insert with check (public.has_permission('raffles'));
drop policy if exists "tickets_update_admin" on public.tickets;
create policy "tickets_update_admin" on public.tickets
  for update using (public.has_permission('raffles'));
drop policy if exists "tickets_delete_admin" on public.tickets;
create policy "tickets_delete_admin" on public.tickets
  for delete using (public.has_permission('raffles'));

drop policy if exists "draws_insert_admin" on public.draws;
create policy "draws_insert_admin" on public.draws
  for insert with check (public.has_permission('raffles'));
drop policy if exists "draws_delete_admin" on public.draws;
create policy "draws_delete_admin" on public.draws
  for delete using (public.has_permission('raffles'));

-- Reportes de shinies: el autor + quien tenga permiso de revisión
drop policy if exists "shiny_reports_select" on public.shiny_reports;
create policy "shiny_reports_select" on public.shiny_reports
  for select using (auth.uid() = author_id or public.has_permission('shinies_review'));

-- Llaves de torneos
drop policy if exists "bracket_matches_insert_admin" on public.bracket_matches;
create policy "bracket_matches_insert_admin" on public.bracket_matches
  for insert with check (public.has_permission('brackets'));
drop policy if exists "bracket_matches_update_admin" on public.bracket_matches;
create policy "bracket_matches_update_admin" on public.bracket_matches
  for update using (public.has_permission('brackets')) with check (public.has_permission('brackets'));
drop policy if exists "bracket_matches_delete_admin" on public.bracket_matches;
create policy "bracket_matches_delete_admin" on public.bracket_matches
  for delete using (public.has_permission('brackets'));

-- Comercio: borrar ofertas ajenas
drop policy if exists "trades_delete_own_or_admin" on public.trades;
create policy "trades_delete_own_or_admin" on public.trades
  for delete using (auth.uid() = author_id or public.has_permission('trades'));

-- Builds: borrar builds ajenas
drop policy if exists "builds_delete_own_or_staff" on public.builds;
create policy "builds_delete_own_or_staff" on public.builds
  for delete using (auth.uid() = author_id or public.has_permission('builds'));

-- Storage "media": subir/actualizar imágenes de gestión = content;
-- borrar = cualquier permiso que implique quitar imágenes (content, revisión,
-- borrado de shinies o gestión de miembros).
drop policy if exists "media_staff_write" on storage.objects;
create policy "media_staff_write" on storage.objects
  for insert with check (bucket_id = 'media' and public.has_permission('content'));

drop policy if exists "media_staff_update" on storage.objects;
create policy "media_staff_update" on storage.objects
  for update using (bucket_id = 'media' and public.has_permission('content'));

drop policy if exists "media_staff_delete" on storage.objects;
create policy "media_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'media' and (
      public.has_permission('content') or
      public.has_permission('shinies_review') or
      public.has_permission('shinies_delete') or
      public.has_permission('members')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) RPCs → matriz de permisos
-- ─────────────────────────────────────────────────────────────────────────────

-- Aprobar reporte de shiny (antes: is_staff)
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
  if not public.has_permission('shinies_review') then
    raise exception 'No tienes permiso para revisar reportes de shinies';
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

-- Rechazar reporte con motivo (antes: is_staff). La foto la elimina el cliente.
create or replace function public.reject_shiny_report(p_report_id uuid, p_reason text default '')
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
  if not public.has_permission('shinies_review') then
    raise exception 'No tienes permiso para revisar reportes de shinies';
  end if;

  select * into v_report from public.shiny_reports where id = p_report_id;
  if not found then
    raise exception 'Reporte no encontrado';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Ese reporte ya fue revisado';
  end if;

  update public.shiny_reports
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         rejection_reason = coalesce(p_reason, '')
   where id = p_report_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_report.author_id,
    'pokemon', v_report.pokemon_name,
    'reason', p_reason
  );
end;
$$;

-- Eliminar un shiny del perfil (antes: is_super_admin)
create or replace function public.delete_hall_of_fame_entry(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.hall_of_fame%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.has_permission('shinies_delete') then
    raise exception 'No tienes permiso para eliminar shinies de perfiles';
  end if;

  select * into v_entry from public.hall_of_fame where id = p_id;
  if not found then
    raise exception 'Ese shiny no existe en el perfil';
  end if;

  update public.profiles
     set shinies = greatest(0, shinies - 1)
   where id = v_entry.user_id;

  delete from public.hall_of_fame where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_entry.user_id,
    'pokemon', v_entry.pokemon_name,
    'image_url', v_entry.image_url
  );
end;
$$;

-- Eliminar miembro (antes: is_super_admin)
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para eliminar miembros';
  end if;
  if not public.has_permission('members') then
    raise exception 'No tienes permiso para eliminar miembros';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- Crear miembro (antes: is_super_admin)
create or replace function public.admin_invite_member(
  p_email text,
  p_username text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.has_permission('members') then
    raise exception 'No tienes permiso para crear miembros';
  end if;
  return public.create_member_user(p_email, p_username, p_password);
end;
$$;

grant execute on function public.approve_shiny_report(uuid) to authenticated;
grant execute on function public.reject_shiny_report(uuid, text) to authenticated;
grant execute on function public.delete_hall_of_fame_entry(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_invite_member(text, text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DLC 14
-- ═══════════════════════════════════════════════════════════════════════════
