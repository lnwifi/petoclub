create table public.anuncios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  titulo text not null,
  descripcion text not null,
  categoria text not null, -- Ejemplo: 'Perdido', 'Encontrado', 'Adopción'
  fecha_creacion timestamp with time zone default timezone('utc'::text, now()),
  imagen_url text,
  destacado boolean not null default false,
  fecha_destacado timestamp with time zone,
  fecha_expiracion_destacado timestamp with time zone
);
