-- ═══════════════════════════════════════════════════════════════════════════
-- WEB PUSH — Suscripciones de notificaciones push
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (se puede ejecutar varias veces: todo es idempotente)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  endpoint   text primary key,                     -- endpoint único del navegador
  user_id    uuid references public.profiles (id) on delete cascade,
  keys       jsonb not null,                        -- { p256dh, auth } para enviar el push
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Suscripciones de Web Push por navegador (las lee la Edge Function send-push con service role)';

alter table public.push_subscriptions enable row level security;

-- Cada miembro solo ve, crea, actualiza y borra SUS propias suscripciones.
-- (La Edge Function usa service_role y se salta estas políticas.)
drop policy if exists "push_sub_select_own"  on public.push_subscriptions;
create policy "push_sub_select_own"  on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_sub_insert_own"  on public.push_subscriptions;
create policy "push_sub_insert_own"  on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_sub_update_own"  on public.push_subscriptions;
create policy "push_sub_update_own"  on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_sub_delete_own"  on public.push_subscriptions;
create policy "push_sub_delete_own"  on public.push_subscriptions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.push_subscriptions to anon, authenticated;
