-- ═══════════════════════════════════════════════════════════════════════════
-- PORTAL SpFc/Gd — Esquema de Supabase (PostgreSQL + RLS)
-- Ejecuta este script en: Supabase Dashboard → SQL Editor → New query
-- (Ejecutar UNA sola vez sobre un proyecto vacío).
-- ═══════════════════════════════════════════════════════════════════════════

-- pgcrypto: provee crypt()/gen_salt() para cifrar contraseñas. Supabase lo
-- instala en el esquema "extensions", por eso las funciones SECURITY DEFINER
-- deben usar search_path = public, extensions para encontrarlo.
create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA PROFILES (ligada a auth.users, define los 4 roles)
-- Nota: debe crearse ANTES que las funciones que la consultan.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  email       text not null,
  role        text not null default 'member'
              check (role in ('super-admin', 'admin', 'gestor', 'member')),
  shinies     integer not null default 0 check (shinies >= 0),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuario ligado a Supabase Auth con rol super-admin/admin/gestor/member';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPERS DE ROLES (funciones SECURITY DEFINER usadas por las políticas RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Solo el super-admin puede otorgar/cambiar roles a los usuarios
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super-admin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super-admin', 'admin')
  );
$$;

-- super-admin, admin o gestor (staff que puede gestionar contenido / contadores)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super-admin', 'admin', 'gestor')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGERS Y FUNCIONES DE PERFILES
-- ─────────────────────────────────────────────────────────────────────────────

-- Actualización automática de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crear el perfil automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, role, shinies)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    new.email,
    'member',
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo el super-admin puede modificar la columna "role" de un perfil.
-- Bloqueo a nivel de trigger para reforzar el RLS (las políticas son por fila).
-- Si no hay contexto de usuario autenticado (SQL editor / service_role) se permite,
-- para no bloquear la administración directa desde Supabase.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sin sesión de usuario (SQL editor, service_role): se permite
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Solo el super-admin puede otorgar o cambiar roles';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_role_change on public.profiles;
create trigger trg_profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LOGIN POR NOMBRE DE USUARIO
-- Permite a la pantalla de acceso resolver el email a partir del username
-- del clan (el login pide usuario + contraseña, no el correo).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where username = p_username
  limit 1;
$$;

-- Necesario para poder consultarla desde la pantalla de login sin sesión
grant execute on function public.get_login_email(text) to anon, authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CONTENIDO: NOTICIAS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  excerpt    text not null default '',
  content    text not null default '',
  image_url  text,
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CONTENIDO: EVENTOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  date        timestamptz not null,
  location    text not null default '',
  image_url   text,
  author_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CONTENIDO: TORNEOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  format      text not null default '',
  rules       text not null default '',
  prize       text not null default '',
  start_date  timestamptz not null,
  status      text not null default 'open'
              check (status in ('open', 'in_progress', 'finished')),
  image_url   text,
  author_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_tournaments_updated_at on public.tournaments;
create trigger trg_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CONTENIDO: GUÍAS Y BUILDEOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.guides (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  excerpt    text not null default '',
  content    text not null default '',
  tags       text[] not null default '{}',
  image_url  text,
  video_url  text,
  documents  jsonb not null default '[]'::jsonb,
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_guides_updated_at on public.guides;
create trigger trg_guides_updated_at
  before update on public.guides
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. COMENTARIOS (inscripciones de torneos, eventos, etc.)
-- parent_type indica sobre qué entidad comenta el usuario
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('tournament', 'event', 'news')),
  parent_id   uuid not null,
  author_id   uuid references public.profiles (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create index if not exists idx_comments_parent on public.comments (parent_type, parent_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TICKETS DE SORTEOS (username único = clave natural para el upsert masivo)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.tickets (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  quantity   integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- Historial de sorteos ejecutados
create table if not exists public.draws (
  id          uuid primary key default gen_random_uuid(),
  winners     jsonb not null,
  total_balls integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. POLÍTICAS RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.news          enable row level security;
alter table public.events        enable row level security;
alter table public.tournaments   enable row level security;
alter table public.guides        enable row level security;
alter table public.comments      enable row level security;
alter table public.tickets       enable row level security;
alter table public.draws         enable row level security;

-- Profiles: todos los autenticados leen; cada usuario edita su perfil;
-- el staff corrige contadores; el super-admin gestiona roles (ver trigger prevent_role_change)
drop policy if exists "profiles_select_auth"  on public.profiles;
create policy "profiles_select_auth"  on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists "profiles_update_own"   on public.profiles;
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff" on public.profiles for update using (public.is_staff());
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles for delete using (public.is_staff());

-- Noticias: lectura autenticada, escritura admin/gestor
drop policy if exists "news_select_auth"   on public.news;
create policy "news_select_auth"   on public.news for select using (auth.role() = 'authenticated');
drop policy if exists "news_insert_staff"  on public.news;
create policy "news_insert_staff"  on public.news for insert with check (public.is_staff());
drop policy if exists "news_update_staff"  on public.news;
create policy "news_update_staff"  on public.news for update using (public.is_staff());
drop policy if exists "news_delete_staff"  on public.news;
create policy "news_delete_staff"  on public.news for delete using (public.is_staff());

-- Eventos: lectura autenticada, escritura del staff (admin y gestor)
drop policy if exists "events_select_auth"   on public.events;
create policy "events_select_auth"   on public.events for select using (auth.role() = 'authenticated');
drop policy if exists "events_insert_admin"  on public.events;
create policy "events_insert_admin"  on public.events for insert with check (public.is_staff());
drop policy if exists "events_update_admin"  on public.events;
create policy "events_update_admin"  on public.events for update using (public.is_staff());
drop policy if exists "events_delete_admin"  on public.events;
create policy "events_delete_admin"  on public.events for delete using (public.is_staff());

-- Torneos: lectura autenticada, escritura del staff (admin y gestor)
drop policy if exists "tournaments_select_auth"   on public.tournaments;
create policy "tournaments_select_auth"   on public.tournaments for select using (auth.role() = 'authenticated');
drop policy if exists "tournaments_insert_admin"  on public.tournaments;
create policy "tournaments_insert_admin"  on public.tournaments for insert with check (public.is_staff());
drop policy if exists "tournaments_update_admin"  on public.tournaments;
create policy "tournaments_update_admin"  on public.tournaments for update using (public.is_staff());
drop policy if exists "tournaments_delete_admin"  on public.tournaments;
create policy "tournaments_delete_admin"  on public.tournaments for delete using (public.is_staff());

-- Guías: lectura autenticada, escritura del staff (admin y gestor)
drop policy if exists "guides_select_auth"   on public.guides;
create policy "guides_select_auth"   on public.guides for select using (auth.role() = 'authenticated');
drop policy if exists "guides_insert_admin"  on public.guides;
create policy "guides_insert_admin"  on public.guides for insert with check (public.is_staff());
drop policy if exists "guides_update_admin"  on public.guides;
create policy "guides_update_admin"  on public.guides for update using (public.is_staff());
drop policy if exists "guides_delete_admin"  on public.guides;
create policy "guides_delete_admin"  on public.guides for delete using (public.is_staff());

-- Comentarios: todos leen; cada usuario crea, edita y elimina los suyos; staff los modera
drop policy if exists "comments_select_auth"   on public.comments;
create policy "comments_select_auth"   on public.comments for select using (auth.role() = 'authenticated');
drop policy if exists "comments_insert_own"    on public.comments;
create policy "comments_insert_own"    on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "comments_update_own"    on public.comments;
create policy "comments_update_own"    on public.comments for update using (auth.uid() = author_id);
drop policy if exists "comments_delete_own"    on public.comments;
create policy "comments_delete_own"    on public.comments for delete using (auth.uid() = author_id);
drop policy if exists "comments_delete_staff"  on public.comments;
create policy "comments_delete_staff"  on public.comments for delete using (public.is_staff());

-- Tickets: lectura autenticada; solo el admin sincroniza (upsert) y gestiona
drop policy if exists "tickets_select_auth"  on public.tickets;
create policy "tickets_select_auth"  on public.tickets for select using (auth.role() = 'authenticated');
drop policy if exists "tickets_insert_admin" on public.tickets;
create policy "tickets_insert_admin" on public.tickets for insert with check (public.is_admin());
drop policy if exists "tickets_update_admin" on public.tickets;
create policy "tickets_update_admin" on public.tickets for update using (public.is_admin());
drop policy if exists "tickets_delete_admin" on public.tickets;
create policy "tickets_delete_admin" on public.tickets for delete using (public.is_admin());

-- Historial de sorteos: lectura autenticada, escritura admin
drop policy if exists "draws_select_auth"  on public.draws;
create policy "draws_select_auth"  on public.draws for select using (auth.role() = 'authenticated');
drop policy if exists "draws_insert_admin" on public.draws;
create policy "draws_insert_admin" on public.draws for insert with check (public.is_admin());
drop policy if exists "draws_delete_admin" on public.draws;
create policy "draws_delete_admin" on public.draws for delete using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. REALTIME (sincronización en vivo de la tabla Shiny Hunt y tickets)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then
  null; -- ya estaba añadida
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.tickets;
exception when duplicate_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.news;
exception when duplicate_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception when duplicate_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then
  null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. STORAGE: bucket público "media" para imágenes (noticias, eventos, ...)
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read"  on storage.objects;
create policy "media_public_read"  on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media_staff_write"  on storage.objects;
create policy "media_staff_write"  on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "media_staff_update" on storage.objects;
create policy "media_staff_update" on storage.objects for update using (bucket_id = 'media' and public.is_staff());
drop policy if exists "media_staff_delete" on storage.objects;
create policy "media_staff_delete" on storage.objects for delete using (bucket_id = 'media' and public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. ELIMINAR MIEMBRO (solo super-admin)
-- Borra la fila de auth.users; el perfil e identidades se borran en cascada.
-- El cliente no puede borrar auth.users directamente, por eso se expone como
-- función SECURITY DEFINER que valida que el llamante sea super-admin.
-- ─────────────────────────────────────────────────────────────────────────────

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
  if not public.is_super_admin() then
    raise exception 'Solo el super-admin puede eliminar miembros';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. CREAR MIEMBRO (sin depender del email de confirmación)
-- Inserta directamente en auth.users (correo verificado) + auth.identities,
-- evitando los rate limits de GoTrue y el problema de columnas NULL.
-- El trigger on_auth_user_created crea el perfil con rol "member".
-- IMPORTANTE: search_path = public, extensions para que crypt()/gen_salt()
-- (instaladas en "extensions" por Supabase) sean visibles dentro de la función.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_member_user(
  p_email text,
  p_username text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_email text := lower(btrim(p_email));
  v_username text := btrim(p_username);
  v_col text;
begin
  if v_username = '' or v_email = '' or p_password is null or length(p_password) < 6 then
    raise exception 'Usuario, correo y contraseña son obligatorios (contraseña mínima de 6 caracteres)';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ese correo ya está registrado';
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    raise exception 'Ese nombre de usuario ya está en uso';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, phone,
    encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, last_sign_in_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', v_email, null,
    crypt(p_password, gen_salt('bf', 10)), now(),
    '', '', '',
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', v_username),
    now(), now(), now()
  )
  returning id into v_user_id;

  -- Asegura que ninguna columna de texto quede NULL (GoTrue falla con NULL),
  -- PERO excluye "phone": debe permanecer NULL para usuarios de email
  -- (un '' duplicado violaría la constraint única users_phone_key)
  for v_col in
    select column_name
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name <> 'phone'
      and data_type in ('text', 'character varying', 'character')
  loop
    execute format(
      'update auth.users set %I = coalesce(%I, ''''::text) where id = %L and %I is null',
      v_col, v_col, v_user_id, v_col
    );
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = 'email_change_confirm_status'
  ) then
    update auth.users set email_change_confirm_status = 0 where id = v_user_id;
  end if;

  insert into auth.identities (
    provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at
  )
  values (
    'email', v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    now(), now(), now()
  );

  return v_user_id;
end;
$$;

-- Solo el super-admin puede crear miembros desde Gestión de Miembros
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
  if not public.is_super_admin() then
    raise exception 'Solo el super-admin puede crear miembros';
  end if;
  return public.create_member_user(p_email, p_username, p_password);
end;
$$;

-- Alta pública desde la pantalla de login (sin rate limits de correo)
create or replace function public.public_register_member(
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
  if exists (select 1 from auth.users limit 1) then
    if auth.uid() is null then
      raise exception 'El registro público está deshabilitado';
    end if;
  end if;
  return public.create_member_user(p_email, p_username, p_password);
end;
$$;

grant execute on function public.create_member_user(text, text, text) to authenticated;
grant execute on function public.admin_invite_member(text, text, text) to authenticated;
grant execute on function public.public_register_member(text, text, text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL ESQUEMA
-- ═══════════════════════════════════════════════════════════════════════════
