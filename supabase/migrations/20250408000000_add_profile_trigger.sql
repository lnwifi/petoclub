-- Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear la función que manejará la sincronización de perfiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Crear el trigger que se activará cuando se cree un nuevo usuario
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Agregar comentarios explicativos
comment on function public.handle_new_user() is 'Función que crea automáticamente un perfil cuando se registra un nuevo usuario';
comment on trigger on_auth_user_created on auth.users is 'Trigger que se activa después de crear un nuevo usuario para crear su perfil';