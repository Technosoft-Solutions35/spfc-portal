-- Tabla de ranking PvP / Wars de Equipos del clan.
-- Cada fila es un miembro registrado con sus estadísticas de combate.
-- total_battles y winrate se calculan dinámicamente a partir de victories y defeats.

create table if not exists public.pvp_rankings (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  victories  integer not null default 0 check (victories >= 0),
  defeats    integer not null default 0 check (defeats >= 0),
  updated_at timestamptz not null default now()
);

alter table public.pvp_rankings enable row level security;

-- Todos los autenticados pueden leer (el ranking es público dentro del portal)
drop policy if exists "pvp_select_all" on public.pvp_rankings;
create policy "pvp_select_all" on public.pvp_rankings
  for select using (auth.uid() is not null);

-- Solo staff puede insertar/actualizar/eliminar
drop policy if exists "pvp_staff_write" on public.pvp_rankings;
create policy "pvp_staff_write" on public.pvp_rankings
  for all using (public.has_permission('content') or public.is_super_admin());

grant select on table public.pvp_rankings to authenticated;
grant insert, update, delete on table public.pvp_rankings to authenticated;

-- Vista helper: ranking completo con datos del perfil
-- (se usa desde el frontend con query normal, esta vista es opcional)
create or replace view public.pvp_rankings_full as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.role,
  coalesce(r.victories, 0) as victories,
  coalesce(r.defeats, 0) as defeats,
  coalesce(r.victories, 0) + coalesce(r.defeats, 0) as total_battles,
  case
    when coalesce(r.victories, 0) + coalesce(r.defeats, 0) = 0 then 0
    else round(coalesce(r.victories, 0)::numeric / (coalesce(r.victories, 0) + coalesce(r.defeats, 0)) * 100, 1)
  end as winrate
from public.profiles p
left join public.pvp_rankings r on r.user_id = p.id
order by victories desc, defeats asc;
