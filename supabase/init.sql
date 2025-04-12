-- Script de inicialización para la base de datos de Pet Club App
-- Este script configura todas las tablas y políticas necesarias para la aplicación

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

-- Eliminar políticas existentes para la tabla pets si ya existen
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;

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

-- Eliminar políticas existentes para el bucket pet-images si ya existen
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pet images" ON storage.objects;

-- Crear políticas para el bucket de imágenes de mascotas
CREATE POLICY "Enable insert for authenticated users only" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'pet-images'
  AND (storage.foldername(name))[1] = 'pets'
);

CREATE POLICY "Enable select for authenticated users only" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'pet-images'
);

CREATE POLICY "Enable update for authenticated users only" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'pet-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Enable delete for authenticated users only" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'pet-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

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

-- Eliminar política adicional si existe
DROP POLICY IF EXISTS "Public access to pet images" ON storage.objects;