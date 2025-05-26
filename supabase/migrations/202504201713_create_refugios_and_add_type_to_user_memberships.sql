-- Crear tabla refugios
create table if not exists public.refugios (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    direccion text,
    telefono text,
    email text,
    descripcion text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Agregar columna type a user_memberships
alter table if exists public.user_memberships
add column if not exists type text;
