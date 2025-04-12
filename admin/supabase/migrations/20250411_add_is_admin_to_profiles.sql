-- Verificar y agregar el campo is_admin a la tabla profiles si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Crear función RPC para verificar si un usuario es administrador
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
    USING (is_user_admin());
