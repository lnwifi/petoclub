-- Agregar columna hours a places si no existe
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS hours JSONB;
