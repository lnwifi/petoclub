-- Crear tabla places para negocios/lugares
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image TEXT, -- URL de la imagen
    rating REAL, -- rating promedio, opcional
    type TEXT, -- categoría, ej: 'Veterinary', 'Grooming', etc
    address TEXT,
    phone TEXT,
    hours JSONB, -- horarios de apertura/cierre por día [{open: '09:00', close: '19:00'}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública
CREATE POLICY "Public read access for places" ON public.places
  FOR SELECT USING (true);

-- Permitir inserción solo a usuarios autenticados
CREATE POLICY "Authenticated insert access for places" ON public.places
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir actualización solo a usuarios autenticados
CREATE POLICY "Authenticated update access for places" ON public.places
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir eliminación solo a administradores (ajustar según tu lógica de roles)
-- CREATE POLICY "Admin delete access for places" ON public.places
--   FOR DELETE USING (auth.role() = 'service_role');
