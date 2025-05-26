create table if not exists red_de_ayuda (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  tipo_aviso text not null, -- perdido, encontrado, adopcion
  especie text,
  nombre text,
  descripcion text,
  ubicacion text,
  fecha date,
  imagen_url text,
  contacto text,
  estado text default 'activo', -- activo, resuelto, eliminado
  created_at timestamp with time zone default timezone('utc'::text, now())
);
