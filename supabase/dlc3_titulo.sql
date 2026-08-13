-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 3 — Título personal en el perfil
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente: se puede ejecutar varias veces sin romper nada)
--
-- Añade un título personal opcional al perfil (ej: Youtuber, Capitán, ...)
-- que se muestra junto al nombre de usuario en los perfiles.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists title text
  check (title is null or char_length(title) <= 60);

comment on column public.profiles.title
  is 'Título personal opcional del jugador que se muestra junto a su nombre (máx. 60 caracteres)';
