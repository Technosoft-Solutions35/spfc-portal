-- DLC 12 — Categorías en guías.
-- Añade el campo `categories` (text[]) a `public.guides` para poder agrupar
-- las guías por categorías (Farmeo, Crianza, Raids...).
-- Ya aplicado en la BD live; este archivo queda como registro del cambio.

alter table public.guides add column if not exists categories text[] default '{}';

-- Las políticas existentes de guías ya cubren select/insert/update/delete
-- (guides_select_auth, guides_insert_admin, guides_update_admin,
-- guides_delete_admin), así que no hay que tocar RLS.
