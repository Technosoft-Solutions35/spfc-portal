-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 11: Nota de rechazo en reportes de shinies.
-- La bandeja de revisión ahora pide un motivo al desaprobar; se guarda en
-- shiny_reports.rejection_reason para que el miembro lo vea en "Mis Shinies"
-- y se le notifica con ese motivo.
--
-- EJECUTAR EN Supabase → SQL Editor (o: supabase db push).
--
-- ⚠️ Fix (DLC 11 v2): el borrado de la foto YA NO se hace desde SQL con
-- `delete from storage.objects` — Supabase Storage lo bloquea con "Direct
-- deletion from storage tables is not allowed. Use the Storage API instead."
-- La imagen la elimina el cliente con la Storage API (media_staff_delete).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Columna con el motivo del rechazo
alter table public.shiny_reports
  add column if not exists rejection_reason text not null default '';

-- 2) RPC de rechazo con motivo opcional (p_reason). Resto del flujo intacto:
--    marca el reporte como 'rejected'. El borrado de la foto se hace desde el
--    cliente con supabase.storage.from('media').remove([...]) (Storage API).
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
  if not public.is_staff() then
    raise exception 'Solo el staff puede rechazar reportes';
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

grant execute on function public.reject_shiny_report(uuid, text) to authenticated;
