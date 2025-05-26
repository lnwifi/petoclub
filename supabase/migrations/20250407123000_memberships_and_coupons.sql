-- Crear tabla de membresías
CREATE TABLE IF NOT EXISTS public.membership_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_pets INTEGER NOT NULL,
    max_photos_per_pet INTEGER NOT NULL,
    max_interests_per_pet INTEGER NOT NULL,
    has_ads BOOLEAN NOT NULL DEFAULT TRUE,
    has_coupons BOOLEAN NOT NULL DEFAULT FALSE,
    has_store_discount BOOLEAN NOT NULL DEFAULT FALSE,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de membresías de usuarios
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Crear tabla de cupones
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    discount_percentage INTEGER,
    discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    partner_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar tipos de membresía predeterminados si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.membership_types WHERE name = 'Gratuita') THEN
        INSERT INTO public.membership_types (name, description, max_pets, max_photos_per_pet, max_interests_per_pet, has_ads, has_coupons, has_store_discount, price)
        VALUES ('Gratuita', 'Membresía básica gratuita', 1, 1, 3, TRUE, FALSE, FALSE, 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.membership_types WHERE name = 'Premium') THEN
        INSERT INTO public.membership_types (name, description, max_pets, max_photos_per_pet, max_interests_per_pet, has_ads, has_coupons, has_store_discount, price)
        VALUES ('Premium', 'Membresía premium con beneficios exclusivos', 3, 5, 5, FALSE, TRUE, TRUE, 9.99);
    END IF;
END $$;

-- Añadir restricción única al campo code de discount_coupons si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_coupon_code' 
        AND conrelid = 'public.discount_coupons'::regclass
    ) THEN
        ALTER TABLE public.discount_coupons
        ADD CONSTRAINT unique_coupon_code UNIQUE (code);
    END IF;
END $$;

-- Insertar algunos cupones de ejemplo si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.discount_coupons WHERE code = 'PETHEALTH20') THEN
        INSERT INTO public.discount_coupons (title, description, code, discount_percentage, partner_name, valid_from, valid_until)
        VALUES ('Descuento en veterinaria', 'Obtén un 20% de descuento en consulta veterinaria en Clínica PetHealth', 'PETHEALTH20', 20, 'Clínica PetHealth', now(), now() + interval '3 months');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.discount_coupons WHERE code = 'ACCESORIOS15') THEN
        INSERT INTO public.discount_coupons (title, description, code, discount_percentage, partner_name, valid_from, valid_until)
        VALUES ('Descuento en accesorios', 'Obtén un 15% de descuento en todos los accesorios para mascotas', 'ACCESORIOS15', 15, 'PetShop', now(), now() + interval '2 months');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.discount_coupons WHERE code = 'ALIMENTO10') THEN
        INSERT INTO public.discount_coupons (title, description, code, discount_percentage, partner_name, valid_from, valid_until)
        VALUES ('Descuento en alimentos', 'Obtén un 10% de descuento en alimentos premium para mascotas', 'ALIMENTO10', 10, 'NutriPet', now(), now() + interval '1 month');
    END IF;
END $$;

-- Crear políticas RLS para las tablas si no existen
DO $$
BEGIN
    -- Políticas para membership_types (visible para todos)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE policyname = 'Membership types visible to all' 
        AND tablename = 'membership_types' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Membership types visible to all" ON public.membership_types
            FOR SELECT USING (TRUE);
    END IF;

    -- Políticas para user_memberships (solo el propio usuario)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE policyname = 'Users can view their own memberships' 
        AND tablename = 'user_memberships' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view their own memberships" ON public.user_memberships
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Políticas para discount_coupons (solo usuarios premium)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE policyname = 'Premium users can view coupons' 
        AND tablename = 'discount_coupons' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Premium users can view coupons" ON public.discount_coupons
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.user_memberships um
                    JOIN public.membership_types mt ON um.membership_type_id = mt.id
                    WHERE um.user_id = auth.uid() AND um.is_active = TRUE AND mt.has_coupons = TRUE
                )
            );
    END IF;
END $$;

-- Añadir permisos para las funciones RPC si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'get_user_membership'
        AND proowner = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) THEN
        GRANT EXECUTE ON FUNCTION get_user_membership TO authenticated;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'get_available_coupons'
        AND proowner = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) THEN
        GRANT EXECUTE ON FUNCTION get_available_coupons TO authenticated;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'update_user_membership'
        AND proowner = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) THEN
        GRANT EXECUTE ON FUNCTION update_user_membership TO authenticated;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'can_add_more_pets'
        AND proowner = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) THEN
        GRANT EXECUTE ON FUNCTION can_add_more_pets TO authenticated;
    END IF;
END $$;

-- Función para obtener la membresía de un usuario
DROP FUNCTION IF EXISTS get_user_membership(UUID);

CREATE OR REPLACE FUNCTION get_user_membership(user_id UUID)
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
    WHERE um.user_id = get_user_membership.user_id
    AND um.is_active = TRUE;
    
    -- Si no hay membresía activa, devolver la membresía gratuita
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            mt.id AS membership_type_id,
            mt.name AS membership_name,
            mt.description AS membership_description,
            mt.max_pets,
            mt.max_photos_per_pet,
            mt.max_interests_per_pet,
            mt.has_ads,
            mt.has_coupons,
            mt.has_store_discount,
            mt.price,
            NULL::TIMESTAMP WITH TIME ZONE AS start_date,
            NULL::TIMESTAMP WITH TIME ZONE AS end_date,
            TRUE AS is_active
        FROM public.membership_types mt
        WHERE mt.name = 'Gratuita';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener los cupones disponibles para un usuario
DROP FUNCTION IF EXISTS get_available_coupons(UUID);

CREATE OR REPLACE FUNCTION get_available_coupons(user_id UUID)
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
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.code,
        c.discount_percentage,
        c.discount_amount,
        c.valid_from,
        c.valid_until,
        c.partner_name
    FROM public.discount_coupons c
    WHERE c.valid_from <= now()
    AND (c.valid_until IS NULL OR c.valid_until >= now())
    AND c.is_active = TRUE
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar la membresía de un usuario
DROP FUNCTION IF EXISTS update_user_membership(UUID, UUID, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION update_user_membership(
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
    ) VALUES (
        p_user_id,
        p_membership_type_id,
        now(),
        p_end_date,
        TRUE
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario puede agregar más mascotas
DROP FUNCTION IF EXISTS can_add_more_pets(UUID);

CREATE OR REPLACE FUNCTION can_add_more_pets(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_pet_count INTEGER;
    max_pets INTEGER;
BEGIN
    -- Obtener el número actual de mascotas del usuario
    SELECT COUNT(*) INTO current_pet_count
    FROM public.pets
    WHERE owner_id = can_add_more_pets.user_id;
    
    -- Obtener el número máximo de mascotas permitidas según la membresía
    SELECT mt.max_pets INTO max_pets
    FROM public.user_memberships um
    JOIN public.membership_types mt ON um.membership_type_id = mt.id
    WHERE um.user_id = can_add_more_pets.user_id
    AND um.is_active = TRUE;
    
    -- Si no hay membresía activa, usar la membresía gratuita
    IF max_pets IS NULL THEN
        SELECT mt.max_pets INTO max_pets
        FROM public.membership_types mt
        WHERE mt.name = 'Gratuita';
    END IF;
    
    RETURN current_pet_count < max_pets;
END;
$$ LANGUAGE plpgsql;

-- Crear políticas de seguridad para las tablas
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
