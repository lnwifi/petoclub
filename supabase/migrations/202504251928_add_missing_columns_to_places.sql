-- Asegura que las columnas requeridas existan en la tabla places
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS rating REAL;
