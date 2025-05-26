-- Corrige la función get_all_profiles para usar SECURITY DEFINER y así ignorar RLS
DROP FUNCTION IF EXISTS public.get_all_profiles;

CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    email text,
    full_name text,
    avatar_url text,
    notifications_enabled boolean,
    email_notifications_enabled boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_admin boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        id,
        user_id,
        email,
        full_name,
        avatar_url,
        notifications_enabled,
        email_notifications_enabled,
        created_at,
        updated_at,
        is_admin
    FROM public.profiles;
$$;

-- Otorgar permisos de ejecución a los usuarios autenticados
REVOKE ALL ON FUNCTION public.get_all_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;
