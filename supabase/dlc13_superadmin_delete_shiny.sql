-- DLC 13 — Eliminar un shiny del perfil de un usuario (solo super-admin).
-- Quita la entrada del Hall of Fame, deshace el +1 del contador del autor y
-- borra la imagen de evidencia del Storage. Sirve para quitar shinies que
-- fueron aprobados por error.

create or replace function public.delete_hall_of_fame_entry(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_entry public.hall_of_fame%rowtype;
  v_path  text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.is_super_admin() then
    raise exception 'Solo el super-admin puede eliminar shinies del perfil';
  end if;

  select * into v_entry from public.hall_of_fame where id = p_id;
  if not found then
    raise exception 'Ese shiny no existe en el perfil';
  end if;

  -- Contador de shinies del autor (nunca baja de 0)
  update public.profiles
     set shinies = greatest(0, shinies - 1)
   where id = v_entry.user_id;

  -- Borra la imagen de evidencia del Storage
  v_path := regexp_replace(v_entry.image_url, '^.*/object/public/[^/]+/', '');
  delete from storage.objects
   where bucket_id = 'media' and name = v_path;

  delete from public.hall_of_fame where id = p_id;

  return jsonb_build_object('ok', true, 'user_id', v_entry.user_id, 'pokemon', v_entry.pokemon_name);
end;
$$;

grant execute on function public.delete_hall_of_fame_entry(uuid) to authenticated;
