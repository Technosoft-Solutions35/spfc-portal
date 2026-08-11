-- ═══════════════════════════════════════════════════════════════════════════
-- SIEMBRA DEL SUPER-ADMIN — ProfesorRaymonGX
-- Crea directamente en auth.users la cuenta del fundador con rol super-admin
-- y su correo YA VERIFICADO (email_confirmed_at = now()).
--
-- IMPORTANTE: ejecuta este script DESPUÉS de haber creado las tablas y el
-- trigger on_auth_user_created (schema.sql), para que el perfil se genere solo.
--
-- NOTA: auth.users ya NO tiene un constraint único en "email" en las versiones
-- actuales de Supabase, por lo que ON CONFLICT (email) daría el error 42P10.
-- Usamos INSERT ... WHERE NOT EXISTS para que sea seguro re-ejecutarlo.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Crear el usuario en auth.users (contraseña cifrada con bcrypt,
--    el mismo formato que usa Supabase Auth)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'crawfordpokemmo@gmail.com',
  crypt('Raymon@2003', gen_salt('bf')),
  now(),          -- ← email verificado: la cuenta ya está validada
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"username":"ProfesorRaymonGX"}',
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.users where email = 'crawfordpokemmo@gmail.com'
);

-- 2) Promover su perfil al rol super-admin
--    (el perfil lo crea el trigger on_auth_user_created; si ya existía,
--    simplemente se actualiza el rol)
update public.profiles
set role = 'super-admin'
where username = 'ProfesorRaymonGX';

-- 3) Verificación
select u.email, u.email_confirmed_at is not null as validado, p.username, p.role
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'crawfordpokemmo@gmail.com';
