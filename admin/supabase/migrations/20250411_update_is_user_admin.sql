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

-- Actualizar política para que los administradores puedan ver todos los perfiles
DROP POLICY IF EXISTS "Administradores pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Administradores pueden ver todos los perfiles"
    ON profiles FOR SELECT
    USING (is_user_admin());

-- Actualizar política para que los administradores puedan ver todos los banners
DROP POLICY IF EXISTS "Administradores pueden ver todos los banners" ON banners;
CREATE POLICY "Administradores pueden ver todos los banners"
    ON banners FOR SELECT
    USING (is_user_admin());

-- Actualizar política para que los administradores puedan crear banners
DROP POLICY IF EXISTS "Administradores pueden crear banners" ON banners;
CREATE POLICY "Administradores pueden crear banners"
    ON banners FOR INSERT
    WITH CHECK (is_user_admin());
