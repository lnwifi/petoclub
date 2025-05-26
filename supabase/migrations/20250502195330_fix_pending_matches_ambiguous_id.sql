-- Create a temporary function with the correct logic
CREATE OR REPLACE FUNCTION public.get_pending_matches_temp(user_pet_id UUID)
RETURNS TABLE (
    match_id UUID,
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
    -- Get the owner ID of the selected pet
    SELECT owner_id INTO user_owner_id 
    FROM public.pets 
    WHERE id = user_pet_id;
    
    -- Verify that the pet exists and belongs to a valid user
    IF user_owner_id IS NULL THEN
        RAISE EXCEPTION 'Mascota no encontrada o no pertenece a un usuario válido';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as match_id,
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
        (m.pet_id_1 = user_pet_id AND m.status_2 = 'pending')
        OR (m.pet_id_2 = user_pet_id AND m.status_1 = 'pending')
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_pending_matches_temp TO authenticated;

-- Drop the old function
DROP FUNCTION IF EXISTS public.get_pending_matches;

-- Rename the temporary function to the original name
ALTER FUNCTION public.get_pending_matches_temp RENAME TO get_pending_matches;

-- Grant execute permission again
GRANT EXECUTE ON FUNCTION public.get_pending_matches TO authenticated;
