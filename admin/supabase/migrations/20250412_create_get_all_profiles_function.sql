-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS get_all_profiles();

-- Crear función RPC para obtener todos los perfiles
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID
) AS $$
BEGIN
  -- Verificar si el usuario actual es administrador
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  ) THEN
    -- Si es administrador, devolver todos los perfiles
    RETURN QUERY 
    SELECT 
      p.id as profile_id,
      (SELECT email FROM auth.users WHERE id = p.id) as email,
      p.full_name,
      p.avatar_url,
      p.is_admin,
      p.created_at,
      p.updated_at,
      p.id as user_id
    FROM profiles p;
  ELSE
    -- Si no es administrador, devolver solo su perfil
    RETURN QUERY 
    SELECT 
      p.id as profile_id,
      (SELECT email FROM auth.users WHERE id = p.id) as email,
      p.full_name,
      p.avatar_url,
      p.is_admin,
      p.created_at,
      p.updated_at,
      p.id as user_id
    FROM profiles p 
    WHERE p.id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO anon;