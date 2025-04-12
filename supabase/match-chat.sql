-- Script para crear las tablas y políticas necesarias para el sistema de match y chat

-- Tabla para almacenar los matches entre mascotas
CREATE TABLE IF NOT EXISTS public.pet_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id_1 UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    pet_id_2 UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    status_1 TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    status_2 TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    match_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'matched', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unique_pet_match UNIQUE (pet_id_1, pet_id_2),
    CONSTRAINT different_pets CHECK (pet_id_1 <> pet_id_2)
);

-- Tabla para almacenar los mensajes del chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.pet_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Función para verificar si un usuario es dueño de una mascota
CREATE OR REPLACE FUNCTION public.is_pet_owner(pet_id UUID, user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = pet_id AND owner_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es parte de un match
CREATE OR REPLACE FUNCTION public.is_match_participant(match_id UUID, user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pet_matches m
        JOIN public.pets p1 ON m.pet_id_1 = p1.id
        JOIN public.pets p2 ON m.pet_id_2 = p2.id
        WHERE m.id = match_id AND (p1.owner_id = user_id OR p2.owner_id = user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar el estado del match cuando ambas partes aceptan
CREATE OR REPLACE FUNCTION public.update_match_status() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_1 = 'accepted' AND NEW.status_2 = 'accepted' THEN
        NEW.match_status := 'matched';
    ELSIF NEW.status_1 = 'rejected' OR NEW.status_2 = 'rejected' THEN
        NEW.match_status := 'rejected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el estado del match
CREATE TRIGGER update_match_status_trigger
BEFORE UPDATE ON public.pet_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_match_status();

-- Políticas para la tabla pet_matches

-- Ver matches donde el usuario es dueño de alguna de las mascotas
CREATE POLICY "Users can view their own matches" ON public.pet_matches
    FOR SELECT
    USING (
        is_pet_owner(pet_id_1, auth.uid()) OR 
        is_pet_owner(pet_id_2, auth.uid())
    );

-- Insertar matches donde el usuario es dueño de la primera mascota
CREATE POLICY "Users can create matches for their pets" ON public.pet_matches
    FOR INSERT
    WITH CHECK (
        is_pet_owner(pet_id_1, auth.uid())
    );

-- Actualizar matches donde el usuario es dueño de alguna de las mascotas
CREATE POLICY "Users can update their own matches" ON public.pet_matches
    FOR UPDATE
    USING (
        (is_pet_owner(pet_id_1, auth.uid()) AND OLD.status_1 = 'pending') OR 
        (is_pet_owner(pet_id_2, auth.uid()) AND OLD.status_2 = 'pending')
    );

-- Políticas para la tabla chat_messages

-- Ver mensajes de chats donde el usuario es parte del match
CREATE POLICY "Users can view messages from their matches" ON public.chat_messages
    FOR SELECT
    USING (
        is_match_participant(match_id, auth.uid())
    );

-- Insertar mensajes en chats donde el usuario es parte del match y el match está en estado 'matched'
CREATE POLICY "Users can send messages to their matches" ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        is_match_participant(match_id, auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.pet_matches
            WHERE id = match_id AND match_status = 'matched'
        )
    );

-- Actualizar mensajes (marcar como leídos) donde el usuario es el destinatario
CREATE POLICY "Users can mark messages as read" ON public.chat_messages
    FOR UPDATE
    USING (
        is_match_participant(match_id, auth.uid()) AND
        sender_id <> auth.uid()
    );

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
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.species, p.breed, p.age, p.description, p.image_url, p.owner_id
    FROM public.pets p
    WHERE 
        -- Misma especie que la mascota del usuario
        p.species = (SELECT species FROM public.pets WHERE id = user_pet_id)
        -- No es la mascota del usuario
        AND p.id <> user_pet_id
        -- No es del mismo dueño
        AND p.owner_id <> (SELECT owner_id FROM public.pets WHERE id = user_pet_id)
        -- No existe un match pendiente o completado
        AND NOT EXISTS (
            SELECT 1 FROM public.pet_matches m
            WHERE (m.pet_id_1 = user_pet_id AND m.pet_id_2 = p.id)
               OR (m.pet_id_1 = p.id AND m.pet_id_2 = user_pet_id)
        )
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
