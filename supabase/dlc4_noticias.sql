-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 4 — Sección de Noticias: enlace externo y categorías
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente: se puede ejecutar varias veces sin romper nada)
--
-- Añade a las noticias:
--   url         → enlace a web/YouTube si la noticia corresponde a una fuente
--   categories  → categorías múltiples (Eventos, Nuevas Mecánicas, Mods, ...)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.news
  add column if not exists url         text,
  add column if not exists categories  text[] not null default '{}';

comment on column public.news.url
  is 'Enlace externo opcional (sitio web o video de YouTube) relacionado con la noticia';

comment on column public.news.categories
  is 'Categorías de la noticia (selección múltiple): Eventos, Nuevas Mecánicas, Mods, Informaciones del juego, Informaciones del clan, Otras';
