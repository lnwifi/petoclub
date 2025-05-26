-- Crear tabla de tipos de membresías
CREATE TABLE IF NOT EXISTS public.membership_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    max_pets INTEGER NOT NULL,
    max_photos_per_pet INTEGER NOT NULL,
    max_interests_per_pet INTEGER NOT NULL,
    has_ads BOOLEAN NOT NULL DEFAULT TRUE,
    has_coupons BOOLEAN NOT NULL DEFAULT FALSE,
    has_store_discount BOOLEAN NOT NULL DEFAULT FALSE,
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de membresías de usuarios
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Crear tabla para cupones de descuento (solo para usuarios premium)
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    discount_percentage INTEGER,
    discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    partner_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para fotos de mascotas
CREATE TABLE IF NOT EXISTS public.pet_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para intereses de mascotas
CREATE TABLE IF NOT EXISTS public.pet_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    interest TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar tipos de membresía predeterminados
INSERT INTO public.membership_types (name, description, max_pets, max_photos_per_pet, max_interests_per_pet, has_ads, has_coupons, has_store_discount, price)
VALUES 
('Gratuita', 'Membresía básica gratuita', 1, 1, 3, TRUE, FALSE, FALSE, 0),
('Premium', 'Membresía premium con beneficios exclusivos', 3, 5, 5, FALSE, TRUE, TRUE, 9.99);

-- Función para asignar membresía gratuita a nuevos usuarios
CREATE OR REPLACE FUNCTION public.assign_free_membership()
RETURNS TRIGGER AS $$
DECLARE
    free_membership_id UUID;
BEGIN
    -- Obtener el ID de la membresía gratuita
    SELECT id INTO free_membership_id FROM public.membership_types WHERE name = 'Gratuita' LIMIT 1;
    
    -- Asignar membresía gratuita al nuevo usuario
    INSERT INTO public.user_memberships (user_id, membership_type_id)
    VALUES (NEW.id, free_membership_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para asignar membresía gratuita a nuevos usuarios
DROP TRIGGER IF EXISTS assign_free_membership_trigger ON auth.users;
CREATE TRIGGER assign_free_membership_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_free_membership();

-- Función para verificar límites de membresía al agregar mascotas
CREATE OR REPLACE FUNCTION public.check_pet_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_membership_record RECORD;
    current_pet_count INTEGER;
BEGIN
    -- Obtener información de membresía del usuario
    SELECT um.*, mt.max_pets 
    INTO user_membership_record
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = NEW.owner_id AND um.is_active = TRUE;
    
    -- Contar mascotas actuales del usuario
    SELECT COUNT(*) INTO current_pet_count
    FROM public.pets
    WHERE owner_id = NEW.owner_id;
    
    -- Verificar si excede el límite
    IF current_pet_count >= user_membership_record.max_pets THEN
        RAISE EXCEPTION 'Has alcanzado el límite de mascotas para tu membresía actual';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar límite de mascotas
DROP TRIGGER IF EXISTS check_pet_limit_trigger ON public.pets;
CREATE TRIGGER check_pet_limit_trigger
BEFORE INSERT ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.check_pet_limit();

-- Función para verificar límites de fotos por mascota
CREATE OR REPLACE FUNCTION public.check_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    pet_owner_id UUID;
    user_membership_record RECORD;
    current_photo_count INTEGER;
BEGIN
    -- Obtener el ID del dueño de la mascota
    SELECT owner_id INTO pet_owner_id
    FROM public.pets
    WHERE id = NEW.pet_id;
    
    -- Obtener información de membresía del usuario
    SELECT um.*, mt.max_photos_per_pet 
    INTO user_membership_record
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = pet_owner_id AND um.is_active = TRUE;
    
    -- Contar fotos actuales de la mascota
    SELECT COUNT(*) INTO current_photo_count
    FROM public.pet_photos
    WHERE pet_id = NEW.pet_id;
    
    -- Verificar si excede el límite
    IF current_photo_count >= user_membership_record.max_photos_per_pet THEN
        RAISE EXCEPTION 'Has alcanzado el límite de fotos para esta mascota según tu membresía actual';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar límite de fotos
DROP TRIGGER IF EXISTS check_photo_limit_trigger ON public.pet_photos;
CREATE TRIGGER check_photo_limit_trigger
BEFORE INSERT ON public.pet_photos
FOR EACH ROW
EXECUTE FUNCTION public.check_photo_limit();

-- Función para verificar límites de intereses por mascota
CREATE OR REPLACE FUNCTION public.check_interest_limit()
RETURNS TRIGGER AS $$
DECLARE
    pet_owner_id UUID;
    user_membership_record RECORD;
    current_interest_count INTEGER;
BEGIN
    -- Obtener el ID del dueño de la mascota
    SELECT owner_id INTO pet_owner_id
    FROM public.pets
    WHERE id = NEW.pet_id;
    
    -- Obtener información de membresía del usuario
    SELECT um.*, mt.max_interests_per_pet 
    INTO user_membership_record
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = pet_owner_id AND um.is_active = TRUE;
    
    -- Contar intereses actuales de la mascota
    SELECT COUNT(*) INTO current_interest_count
    FROM public.pet_interests
    WHERE pet_id = NEW.pet_id;
    
    -- Verificar si excede el límite
    IF current_interest_count >= user_membership_record.max_interests_per_pet THEN
        RAISE EXCEPTION 'Has alcanzado el límite de intereses para esta mascota según tu membresía actual';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar límite de intereses
DROP TRIGGER IF EXISTS check_interest_limit_trigger ON public.pet_interests;
CREATE TRIGGER check_interest_limit_trigger
BEFORE INSERT ON public.pet_interests
FOR EACH ROW
EXECUTE FUNCTION public.check_interest_limit();

-- Función para obtener información de membresía de un usuario
-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS public.get_user_membership;

CREATE OR REPLACE FUNCTION public.get_user_membership(user_id UUID)
RETURNS TABLE (
    membership_type_id UUID,
    membership_name TEXT,
    membership_description TEXT,
    max_pets INTEGER,
    max_photos_per_pet INTEGER,
    max_interests_per_pet INTEGER,
    has_ads BOOLEAN,
    has_coupons BOOLEAN,
    has_store_discount BOOLEAN,
    price DECIMAL(10, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        um.membership_type_id,
        mt.name AS membership_name,
        mt.description AS membership_description,
        mt.max_pets,
        mt.max_photos_per_pet,
        mt.max_interests_per_pet,
        mt.has_ads,
        mt.has_coupons,
        mt.has_store_discount,
        mt.price,
        um.start_date,
        um.end_date,
        um.is_active
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = user_id AND um.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar la membresía de un usuario
CREATE OR REPLACE FUNCTION public.update_user_membership(
    p_user_id UUID,
    p_membership_type_id UUID,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Desactivar membresía actual si existe
    UPDATE public.user_memberships
    SET is_active = FALSE, updated_at = now()
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Crear nueva membresía
    INSERT INTO public.user_memberships (
        user_id,
        membership_type_id,
        start_date,
        end_date,
        is_active
    )
    VALUES (
        p_user_id,
        p_membership_type_id,
        now(),
        p_end_date,
        TRUE
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener cupones disponibles para usuarios premium
CREATE OR REPLACE FUNCTION public.get_available_coupons(user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    code TEXT,
    discount_percentage INTEGER,
    discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    partner_name TEXT
) AS $$
DECLARE
    has_premium_access BOOLEAN;
BEGIN
    -- Verificar si el usuario tiene acceso premium a cupones
    SELECT mt.has_coupons INTO has_premium_access
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = user_id AND um.is_active = TRUE;
    
    -- Si no tiene acceso premium, retornar conjunto vacío
    IF NOT has_premium_access THEN
        RETURN;
    END IF;
    
    -- Retornar cupones disponibles
    RETURN QUERY
    SELECT 
        dc.id,
        dc.title,
        dc.description,
        dc.code,
        dc.discount_percentage,
        dc.discount_amount,
        dc.valid_from,
        dc.valid_until,
        dc.partner_name
    FROM public.discount_coupons dc
    WHERE dc.is_active = TRUE
    AND dc.valid_from <= now()
    AND (dc.valid_until IS NULL OR dc.valid_until >= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para las tablas
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_interests ENABLE ROW LEVEL SECURITY;

-- Políticas para membership_types (visible para todos)
CREATE POLICY "Membership types visible to all" ON public.membership_types
    FOR SELECT USING (TRUE);

-- Políticas para user_memberships (solo el propio usuario)
CREATE POLICY "Users can view their own memberships" ON public.user_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- Políticas para discount_coupons (solo usuarios premium)
CREATE POLICY "Premium users can view coupons" ON public.discount_coupons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_memberships um
            JOIN public.membership_types mt ON um.membership_type_id = mt.id
            WHERE um.user_id = auth.uid() AND um.is_active = TRUE AND mt.has_coupons = TRUE
        )
    );

-- Políticas para pet_photos
CREATE POLICY "Users can view all pet photos" ON public.pet_photos
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert photos for their own pets" ON public.pet_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos for their own pets" ON public.pet_photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos for their own pets" ON public.pet_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );

-- Políticas para pet_interests
CREATE POLICY "Users can view all pet interests" ON public.pet_interests
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert interests for their own pets" ON public.pet_interests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update interests for their own pets" ON public.pet_interests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete interests for their own pets" ON public.pet_interests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = pet_id AND owner_id = auth.uid()
        )
    );
