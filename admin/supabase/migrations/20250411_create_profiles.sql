-- Verificar si la tabla profiles existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) THEN
        -- Crear tabla profiles si no existe
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            is_admin BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        -- Crear función para actualizar updated_at
        CREATE OR REPLACE FUNCTION update_profiles_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Crear trigger para actualizar updated_at
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_profiles_updated_at_column();

        -- Crear política para que solo los usuarios puedan ver su propio perfil
        CREATE POLICY "Users can view their own data"
            ON profiles FOR SELECT
            USING (auth.uid() = id);

        -- Crear política para que solo los usuarios puedan actualizar su propio perfil
        CREATE POLICY "Users can update own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);

        -- Crear función para verificar si un usuario es administrador
        CREATE OR REPLACE FUNCTION is_user_admin()
        RETURNS BOOLEAN AS $$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Crear política para que los administradores puedan ver todos los perfiles
        CREATE POLICY "Administrators can view all profiles"
            ON profiles FOR SELECT
            USING (is_user_admin());
    END IF;
END $$;

-- Asegurar que el usuario actual tenga un perfil
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid()
    ) THEN
        INSERT INTO profiles (id, is_admin)
        VALUES (auth.uid(), false);
    END IF;
END $$;
