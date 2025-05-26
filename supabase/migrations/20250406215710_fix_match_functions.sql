-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_potential_matches;
DROP FUNCTION IF EXISTS public.get_pending_matches;
DROP FUNCTION IF EXISTS public.get_completed_matches;

-- Create new functions with fixes
CREATE OR REPLACE FUNCTION public.get_potential_matches(user_pet_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    species TEXT,
    breed TEXT,
    age TEXT,
    description TEXT,
    image_url TEXT,
    owner_id UUID
) AS $$
DECLARE
    user_owner_id UUID;
    user_species TEXT;
BEGIN
    -- Obtener el ID del dueño y la especie de la mascota seleccionada
    SELECT p.owner_id, p.species INTO user_owner_id, user_species 
    FROM public.pets p
    WHERE p.id = user_pet_id;
    
    -- Verificar que la mascota existe y pertenece a un usuario válido
    IF user_owner_id IS NULL OR user_species IS NULL THEN
        RAISE EXCEPTION 'Mascota no encontrada o no pertenece a un usuario válido';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.species,
        p.breed,
        p.age,
        p.description,
        p.image_url,
        p.owner_id
    FROM public.pets p
    WHERE 
        p.species = user_species
        AND p.id <> user_pet_id
        AND p.owner_id <> user_owner_id
        AND p.owner_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM public.pet_matches m
            WHERE (m.pet_id_1 = user_pet_id AND m.pet_id_2 = p.id)
               OR (m.pet_id_1 = p.id AND m.pet_id_2 = user_pet_id)
        )
    ORDER BY 
        CASE WHEN p.image_url IS NOT NULL THEN 0 ELSE 1 END,
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_pending_matches(user_pet_id UUID)
RETURNS TABLE (
    id UUID,
    pet_id_1 UUID,
    pet_id_2 UUID,
    status_1 TEXT,
    status_2 TEXT,
    match_status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    pet_name TEXT,
    pet_species TEXT,
    pet_breed TEXT,
    pet_age TEXT,
    pet_description TEXT,
    pet_image_url TEXT,
    pet_owner_id UUID,
    is_initiator BOOLEAN
) AS $$
DECLARE
    user_owner_id UUID;
BEGIN
    -- Obtener el ID del dueño de la mascota seleccionada
    SELECT p.owner_id INTO user_owner_id 
    FROM public.pets p
    WHERE p.id = user_pet_id;
    
    -- Verificar que la mascota existe y pertenece a un usuario válido
    IF user_owner_id IS NULL THEN
        RAISE EXCEPTION 'Mascota no encontrada o no pertenece a un usuario válido';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id, 
        m.pet_id_1, 
        m.pet_id_2, 
        m.status_1, 
        m.status_2, 
        m.match_status, 
        m.created_at, 
        m.updated_at,
        p.name as pet_name,
        p.species as pet_species,
        p.breed as pet_breed,
        p.age as pet_age,
        p.description as pet_description,
        p.image_url as pet_image_url,
        p.owner_id as pet_owner_id,
        CASE WHEN m.pet_id_1 = user_pet_id THEN TRUE ELSE FALSE END as is_initiator
    FROM public.pet_matches m
    JOIN public.pets p ON 
        (m.pet_id_1 = user_pet_id AND m.pet_id_2 = p.id) 
        OR (m.pet_id_2 = user_pet_id AND m.pet_id_1 = p.id)
    WHERE 
        (m.pet_id_1 = user_pet_id AND m.status_2 = 'pending' AND m.status_1 = 'accepted')
        OR (m.pet_id_2 = user_pet_id AND m.status_1 = 'pending' AND m.status_2 = 'accepted')
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_completed_matches(user_pet_id UUID)
RETURNS TABLE (
    id UUID,
    pet_id_1 UUID,
    pet_id_2 UUID,
    status_1 TEXT,
    status_2 TEXT,
    match_status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    pet_name TEXT,
    pet_species TEXT,
    pet_breed TEXT,
    pet_age TEXT,
    pet_description TEXT,
    pet_image_url TEXT,
    pet_owner_id UUID,
    is_initiator BOOLEAN,
    unread_messages INTEGER
) AS $$
DECLARE
    user_owner_id UUID;
    user_pet UUID;
BEGIN
    -- Obtener el ID del dueño de la mascota seleccionada
    SELECT p.owner_id, p.id INTO user_owner_id, user_pet 
    FROM public.pets p
    WHERE p.id = user_pet_id;
    
    -- Verificar que la mascota existe y pertenece a un usuario válido
    IF user_owner_id IS NULL THEN
        RAISE EXCEPTION 'Mascota no encontrada o no pertenece a un usuario válido';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id, 
        m.pet_id_1, 
        m.pet_id_2, 
        m.status_1, 
        m.status_2, 
        m.match_status, 
        m.created_at, 
        m.updated_at,
        p.name as pet_name,
        p.species as pet_species,
        p.breed as pet_breed,
        p.age as pet_age,
        p.description as pet_description,
        p.image_url as pet_image_url,
        p.owner_id as pet_owner_id,
        CASE WHEN m.pet_id_1 = user_pet THEN TRUE ELSE FALSE END as is_initiator,
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id 
             AND cm.read = FALSE
             AND cm.sender_id <> user_owner_id
            ), 0
        )::INTEGER as unread_messages
    FROM public.pet_matches m
    JOIN public.pets p ON 
        (m.pet_id_1 = user_pet AND m.pet_id_2 = p.id) 
        OR (m.pet_id_2 = user_pet AND m.pet_id_1 = p.id)
    WHERE 
        ((m.pet_id_1 = user_pet OR m.pet_id_2 = user_pet) AND m.match_status = 'matched')
    ORDER BY 
        -- Ordenar primero por mensajes no leídos
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id 
             AND cm.read = FALSE
             AND cm.sender_id <> user_owner_id
            ), 0
        ) DESC,
        -- Luego por el mensaje más reciente
        COALESCE(
            (SELECT MAX(cm.created_at) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id
            ), m.updated_at
        ) DESC;
END;
$$ LANGUAGE plpgsql;
