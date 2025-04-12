-- Crear tabla banners
CREATE TABLE banners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL,
    target_section TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    priority INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Crear políticas de seguridad
-- Para administradores: todos los permisos
CREATE POLICY "Administradores pueden ver todos los banners"
    ON banners FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE auth.uid() = profiles.id 
        AND profiles.is_admin = true
    ));

CREATE POLICY "Administradores pueden crear banners"
    ON banners FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles 
        WHERE auth.uid() = profiles.id 
        AND profiles.is_admin = true
    ));

CREATE POLICY "Administradores pueden actualizar banners"
    ON banners FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE auth.uid() = profiles.id 
        AND profiles.is_admin = true
    ));

CREATE POLICY "Administradores pueden eliminar banners"
    ON banners FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE auth.uid() = profiles.id 
        AND profiles.is_admin = true
    ));

-- Para usuarios normales: solo lectura
CREATE POLICY "Usuarios autenticados pueden ver banners"
    ON banners FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE auth.uid() = profiles.id 
        AND profiles.is_admin = true
    ));
