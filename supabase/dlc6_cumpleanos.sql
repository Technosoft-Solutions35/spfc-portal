-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 6 — Cumpleaños
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Solo añade la columna birth_date al perfil. La sección Cumpleaños se
-- alimenta SOLA de aquí: cuando un miembro actualiza su fecha de nacimiento
-- en su perfil, el calendario se actualiza automáticamente (nadie lo edita
-- a mano). Las políticas RLS de profiles (select autenticados + update
-- propio) ya cubren el resto.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists birth_date date;

comment on column public.profiles.birth_date is
  'Fecha de nacimiento del miembro. Solo se usa el día y el mes para el calendario de cumpleaños.';

create index if not exists idx_profiles_birth_date
  on public.profiles (birth_date)
  where birth_date is not null;
