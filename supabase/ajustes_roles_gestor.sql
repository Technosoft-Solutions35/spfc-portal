-- ═══════════════════════════════════════════════════════════════════════════
-- AJUSTE DE PERMISOS — Gestor = Admin (excepto sorteos)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Los roles gestor y admin deben tener los MISMOS permisos de gestión,
-- con UNA sola diferencia: los SORTEOS (tickets + historial) son solo
-- de admin/super-admin; los gestores no gestionan sorteos.
--
-- Antes: eventos, torneos, guías, brackets, comercio y borrado de perfiles
--        usaban is_admin() (solo super-admin + admin).
-- Ahora: esas políticas pasan a is_staff() (super-admin + admin + gestor).
--        tickets y draws permanecen en is_admin() (exclusivos de sorteos).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Eventos: escritura de todo el staff (admin + gestor)
drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin" on public.events
  for insert with check (public.is_staff());

drop policy if exists "events_update_admin" on public.events;
create policy "events_update_admin" on public.events
  for update using (public.is_staff());

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin" on public.events
  for delete using (public.is_staff());

-- 2) Torneos: escritura de todo el staff (admin + gestor)
drop policy if exists "tournaments_insert_admin" on public.tournaments;
create policy "tournaments_insert_admin" on public.tournaments
  for insert with check (public.is_staff());

drop policy if exists "tournaments_update_admin" on public.tournaments;
create policy "tournaments_update_admin" on public.tournaments
  for update using (public.is_staff());

drop policy if exists "tournaments_delete_admin" on public.tournaments;
create policy "tournaments_delete_admin" on public.tournaments
  for delete using (public.is_staff());

-- 3) Guías: escritura de todo el staff (admin + gestor)
drop policy if exists "guides_insert_admin" on public.guides;
create policy "guides_insert_admin" on public.guides
  for insert with check (public.is_staff());

drop policy if exists "guides_update_admin" on public.guides;
create policy "guides_update_admin" on public.guides
  for update using (public.is_staff());

drop policy if exists "guides_delete_admin" on public.guides;
create policy "guides_delete_admin" on public.guides
  for delete using (public.is_staff());

-- 4) Brackets de torneo: gestión de todo el staff (admin + gestor)
drop policy if exists "bracket_matches_insert_admin" on public.bracket_matches;
create policy "bracket_matches_insert_admin" on public.bracket_matches
  for insert with check (public.is_staff());

drop policy if exists "bracket_matches_update_admin" on public.bracket_matches;
create policy "bracket_matches_update_admin" on public.bracket_matches
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "bracket_matches_delete_admin" on public.bracket_matches;
create policy "bracket_matches_delete_admin" on public.bracket_matches
  for delete using (public.is_staff());

-- 5) Comercio: borrado de ofertas ajenas para todo el staff (admin + gestor)
drop policy if exists "trades_delete_own_or_admin" on public.trades;
create policy "trades_delete_own_or_admin" on public.trades
  for delete using (auth.uid() = author_id or public.is_staff());

-- 6) Perfiles: borrado de miembros para todo el staff (admin + gestor)
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_staff());

-- 7) SORTEOS (tickets y draws): SE MANTIENEN en is_admin()
--    (solo super-admin + admin pueden gestionar sorteos).
--    NO se tocan: tickets_insert_admin, tickets_update_admin,
--    tickets_delete_admin, draws_insert_admin, draws_delete_admin.
-- ═══════════════════════════════════════════════════════════════════════════
