-- Configuración de tablas, funciones y políticas para el sistema de match y chat

-- Tabla para almacenar los matches entre mascotas
CREATE TABLE IF NOT EXISTS public.pet_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id_1 UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    pet_id_2 UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    status_1 TEXT NOT NULL DEFAULT 'pending' CHECK (status_1 IN ('pending', 'accepted', 'rejected')),
    status_2 TEXT NOT NULL DEFAULT 'pending' CHECK (status_2 IN ('pending', 'accepted', 'rejected')),
    match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT different_pets CHECK (pet_id_1 <> pet_id_2),
    CONSTRAINT unique_match UNIQUE (pet_id_1, pet_id_2)
);

-- Tabla para almacenar los mensajes de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.pet_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el timestamp de updated_at en pet_matches
DROP TRIGGER IF EXISTS update_pet_matches_updated_at ON public.pet_matches;
CREATE TRIGGER update_pet_matches_updated_at
BEFORE UPDATE ON public.pet_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para actualizar el estado del match cuando ambos usuarios aceptan
CREATE OR REPLACE FUNCTION public.update_match_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Si ambos usuarios aceptaron, actualizar el estado del match a 'matched'
    IF NEW.status_1 = 'accepted' AND NEW.status_2 = 'accepted' THEN
        NEW.match_status := 'matched';
    -- Si alguno rechazó, actualizar el estado del match a 'rejected'
    ELSIF NEW.status_1 = 'rejected' OR NEW.status_2 = 'rejected' THEN
        NEW.match_status := 'rejected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el estado del match
DROP TRIGGER IF EXISTS update_match_status_trigger ON public.pet_matches;
CREATE TRIGGER update_match_status_trigger
BEFORE UPDATE ON public.pet_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_match_status();

-- Función para obtener mascotas potenciales para match
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
    SELECT owner_id, species INTO user_owner_id, user_species 
    FROM public.pets 
    WHERE id = user_pet_id;
    
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
        -- Misma especie que la mascota seleccionada
        p.species = user_species
        -- No es la misma mascota
        AND p.id <> user_pet_id
        -- No pertenece al mismo dueño
        AND p.owner_id <> user_owner_id
        -- No existe un match previo (pendiente, aceptado o rechazado)
        AND NOT EXISTS (
            SELECT 1 
            FROM public.pet_matches m
            WHERE (m.pet_id_1 = user_pet_id AND m.pet_id_2 = p.id)
            OR (m.pet_id_1 = p.id AND m.pet_id_2 = user_pet_id)
        )
        -- La mascota está activa (no eliminada)
        AND p.deleted_at IS NULL
    ORDER BY 
        -- Priorizar mascotas con fotos
        CASE WHEN p.image_url IS NOT NULL THEN 0 ELSE 1 END,
        -- Luego ordenar por fecha de creación (más recientes primero)
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener matches pendientes para una mascota
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
    SELECT owner_id INTO user_owner_id 
    FROM public.pets 
    WHERE id = user_pet_id;
    
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

-- Función para obtener matches completados para una mascota
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
BEGIN
    -- Obtener el ID del dueño de la mascota seleccionada
    SELECT owner_id INTO user_owner_id 
    FROM public.pets 
    WHERE id = user_pet_id;
    
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
        CASE WHEN m.pet_id_1 = user_pet_id THEN TRUE ELSE FALSE END as is_initiator,
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id 
             AND cm.read = FALSE
             AND cm.sender_id <> (SELECT owner_id FROM public.pets WHERE id = user_pet_id)
            ), 0
        )::INTEGER as unread_messages
    FROM public.pet_matches m
    JOIN public.pets p ON 
        (m.pet_id_1 = user_pet_id AND m.pet_id_2 = p.id) 
        OR (m.pet_id_2 = user_pet_id AND m.pet_id_1 = p.id)
    WHERE 
        ((m.pet_id_1 = user_pet_id OR m.pet_id_2 = user_pet_id) AND m.match_status = 'matched')
    ORDER BY 
        -- Ordenar primero por mensajes no leídos
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id 
             AND cm.read = FALSE
             AND cm.sender_id <> (SELECT owner_id FROM public.pets WHERE id = user_pet_id)
            ), 0
        ) DESC,
        -- Luego por el mensaje más reciente
        COALESCE(
            (SELECT MAX(created_at) 
             FROM public.chat_messages cm 
             WHERE cm.match_id = m.id
            ), m.updated_at
        ) DESC;
END;
$$ LANGUAGE plpgsql;

-- Políticas de seguridad para pet_matches

-- Habilitar RLS para pet_matches
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;

-- Política para ver matches
CREATE POLICY view_pet_matches ON public.pet_matches
    FOR SELECT
    USING (
        pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        OR pet_id_2 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );

-- Política para insertar matches
CREATE POLICY insert_pet_matches ON public.pet_matches
    FOR INSERT
    WITH CHECK (
        pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
    );

-- Política para actualizar matches
CREATE POLICY update_pet_matches ON public.pet_matches
    FOR UPDATE
    USING (
        (pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid()) AND status_1 = 'pending')
        OR (pet_id_2 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid()) AND status_2 = 'pending')
    );

-- Políticas de seguridad para chat_messages

-- Habilitar RLS para chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para ver mensajes
CREATE POLICY view_chat_messages ON public.chat_messages
    FOR SELECT
    USING (
        match_id IN (
            SELECT id FROM public.pet_matches
            WHERE pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
            OR pet_id_2 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        )
    );

-- Política para insertar mensajes
CREATE POLICY insert_chat_messages ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND match_id IN (
            SELECT id FROM public.pet_matches
            WHERE match_status = 'matched'
            AND (
                pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
                OR pet_id_2 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
            )
        )
    );

-- Política para actualizar mensajes (marcar como leídos)
CREATE POLICY update_chat_messages ON public.chat_messages
    FOR UPDATE
    USING (
        match_id IN (
            SELECT id FROM public.pet_matches
            WHERE pet_id_1 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
            OR pet_id_2 IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
        )
    );

-- Permisos para usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.pet_matches TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_potential_matches TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_matches TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_matches TO authenticated;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pet_matches_pet_id_1 ON public.pet_matches(pet_id_1);
CREATE INDEX IF NOT EXISTS idx_pet_matches_pet_id_2 ON public.pet_matches(pet_id_2);
CREATE INDEX IF NOT EXISTS idx_pet_matches_match_status ON public.pet_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON public.chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON public.chat_messages(read);
