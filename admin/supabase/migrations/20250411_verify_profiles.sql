-- Verificar estructura de la tabla profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles';

-- Verificar si el campo is_admin existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_admin'
);

-- Verificar el valor actual de is_admin para tu usuario
-- Reemplaza 'TU_ID_DE_USUARIO' con tu ID real
SELECT id, is_admin
FROM profiles
WHERE id = 'd7dad176-df4c-43df-9d23-7ec19a93829a';

-- Si el campo is_admin no existe, crearlo
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Actualizar el valor de is_admin para tu usuario
UPDATE profiles
SET is_admin = true
WHERE id = 'd7dad176-df4c-43df-9d23-7ec19a93829a';

-- Crear función RPC para obtener todos los perfiles (solo para administradores)
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM profiles
    WHERE (
        SELECT is_admin FROM profiles WHERE id = auth.uid()
    ) = true;
END;
$$;

-- Crear política RLS para la función RPC
ALTER FUNCTION get_all_profiles()
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_all_profiles TO authenticated;
