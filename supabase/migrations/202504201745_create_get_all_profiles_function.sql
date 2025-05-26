-- Crear función get_all_profiles para exponer todos los perfiles
create or replace function public.get_all_profiles()
returns table (
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
language sql
as $$
    select
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
    from public.profiles;
$$;
