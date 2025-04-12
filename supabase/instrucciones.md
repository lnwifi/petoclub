# Instrucciones para configurar Supabase

Para evitar el error "column user_id does not exist", sigue estos pasos en el SQL Editor de Supabase:

## Paso 1: Crear las tablas

Ejecuta este código primero:

```sql
-- Tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Crear índice para búsquedas por email
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
```

## Paso 2: Crear la función y los triggers

Ejecuta este código después:

```sql
-- Función y triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Paso 3: Configurar las políticas RLS

Finalmente, ejecuta este código:

```sql
-- Políticas RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_user_policy ON profiles
  FOR ALL
  USING (auth.uid()::text = user_id::text);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_user_policy ON notifications
  FOR ALL
  USING (auth.uid()::text = user_id::text);
```

Si sigues recibiendo el error, prueba esta versión alternativa para las políticas:

```sql
-- Políticas RLS (versión alternativa)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_user_policy ON profiles
  FOR ALL
  TO authenticated
  USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_user_policy ON notifications
  FOR ALL
  TO authenticated
  USING (true);
```

Esta versión alternativa permite que cualquier usuario autenticado acceda a todos los registros, lo cual no es ideal para seguridad pero puede ayudarte a verificar si el problema está en la comparación de user_id.
