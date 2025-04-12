# Configuración de la Base de Datos para Pet Club App

Este documento proporciona instrucciones para configurar la base de datos en Supabase para que funcione la carga de datos de mascotas en la aplicación Pet Club.

## Requisitos previos

1. Tener una cuenta en [Supabase](https://supabase.com)
2. Tener acceso al proyecto de Supabase configurado en `lib/supabase.ts`

## Pasos para configurar la base de datos

### 1. Acceder al Editor SQL de Supabase

1. Inicia sesión en [Supabase](https://supabase.com)
2. Selecciona tu proyecto (Petoclub)
3. En el menú lateral, haz clic en "SQL Editor"
4. Crea un nuevo script SQL

### 2. Ejecutar el siguiente código SQL

Copia y pega el siguiente código SQL en el editor y ejecútalo:

```sql
-- Crear la tabla de mascotas si no existe
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    age TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir a los usuarios ver sus propias mascotas
CREATE POLICY "Users can view their own pets" ON public.pets
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Crear políticas para permitir a los usuarios insertar sus propias mascotas
CREATE POLICY "Users can insert their own pets" ON public.pets
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Crear políticas para permitir a los usuarios actualizar sus propias mascotas
CREATE POLICY "Users can update their own pets" ON public.pets
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Crear políticas para permitir a los usuarios eliminar sus propias mascotas
CREATE POLICY "Users can delete their own pets" ON public.pets
    FOR DELETE
    USING (auth.uid() = owner_id);
```

### 3. Configurar el almacenamiento para imágenes

Ejecuta el siguiente código SQL para crear el bucket de almacenamiento y configurar las políticas de acceso:

```sql
-- Crear bucket de almacenamiento para imágenes de mascotas si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'pet-images'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('pet-images', 'pet-images', true);
    END IF;
END
$$;

-- Configurar política de almacenamiento para permitir a usuarios autenticados subir imágenes
CREATE POLICY "Authenticated users can upload pet images" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pet-images' AND (storage.foldername(name))[1] = 'pets');

-- Configurar política de almacenamiento para permitir acceso público a imágenes de mascotas
CREATE POLICY "Public access to pet images" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'pet-images');
```

## Verificación

Para verificar que la configuración se ha realizado correctamente:

1. En el menú lateral de Supabase, ve a "Table Editor" y confirma que existe la tabla "pets" con la estructura correcta
2. Ve a "Storage" y confirma que existe el bucket "pet-images"
3. Prueba la funcionalidad de agregar mascotas en la aplicación

## Estructura de la tabla pets

| Columna      | Tipo                    | Descripción                           |
|--------------|-------------------------|---------------------------------------|
| id           | UUID                    | Identificador único de la mascota     |
| owner_id     | UUID                    | ID del usuario propietario            |
| name         | TEXT                    | Nombre de la mascota                  |
| species      | TEXT                    | Especie (perro, gato, etc.)           |
| breed        | TEXT                    | Raza (opcional)                       |
| age          | TEXT                    | Edad (opcional)                       |
| description  | TEXT                    | Descripción (opcional)                 |
| image_url    | TEXT                    | URL de la imagen (opcional)           |
| created_at   | TIMESTAMP WITH TIME ZONE| Fecha de creación                     |
| updated_at   | TIMESTAMP WITH TIME ZONE| Fecha de última actualización         |