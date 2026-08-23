-- Función para que el super-admin resetee la contraseña de cualquier usuario
-- Sin necesidad de conocer la contraseña actual ni depender de envío de email.

create or replace function public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.is_super_admin() then
    raise exception 'Solo el super-admin puede resetear contraseñas';
  end if;
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'La nueva contraseña debe tener al menos 6 caracteres';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Usuario no encontrado';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;
