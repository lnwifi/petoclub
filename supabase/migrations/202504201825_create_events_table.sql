-- Tabla de eventos para portal admin y app
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    image_url text, -- URL a una imagen del evento (puede ser de Supabase Storage)
    event_date timestamptz NOT NULL,
    location text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events (event_date);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_on_events ON public.events;
CREATE TRIGGER set_updated_at_on_events
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Permisos básicos (ajusta según tu lógica de roles)
-- Permite a todos leer eventos
GRANT SELECT ON public.events TO anon, authenticated;
-- Permite a authenticated insertar y actualizar (ajusta según tu lógica de admin)
GRANT INSERT, UPDATE ON public.events TO authenticated;
