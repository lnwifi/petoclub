-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS is_user_admin();

-- Crear nueva función RPC para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear política para que los administradores puedan ver todos los perfiles
CREATE POLICY "Administradores pueden ver todos los perfiles"
    ON profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ));

-- Crear política para que los administradores puedan ver todos los banners
CREATE POLICY "Administradores pueden ver todos los banners"
    ON banners FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ));

-- Crear política para que los administradores puedan crear banners
CREATE POLICY "Administradores pueden crear banners"
    ON banners FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ));
