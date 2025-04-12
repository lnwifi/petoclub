# Configuración de Supabase para PetoClub

Para que las notificaciones de pedidos y la integración con MercadoPago funcionen correctamente, es necesario configurar las siguientes tablas en Supabase:

## 1. Tabla de Perfiles (profiles)

Esta tabla almacena la información de los usuarios y sus preferencias de notificaciones.

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
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
```

## 2. Tabla de Notificaciones (notifications)

Esta tabla almacena las notificaciones de actualización de pedidos y otras notificaciones del sistema.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order_update', 'promo', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
```

## 3. Políticas de Seguridad (RLS)

Estas políticas garantizan que los usuarios solo puedan acceder a sus propios datos.

```sql
-- Crear política RLS para perfiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_user_policy ON profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- Crear política RLS para notificaciones
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_user_policy ON notifications
  FOR ALL
  USING (auth.uid() = user_id);
```

## 4. Triggers para actualización de timestamps

```sql
-- Función para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en perfiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en notificaciones
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Pasos para la configuración

1. Inicia sesión en tu panel de Supabase
2. Ve a la sección "SQL Editor"
3. Crea una nueva consulta
4. Copia y pega el código SQL proporcionado en el archivo `supabase-setup.sql`
5. Ejecuta la consulta

## Verificación

Para verificar que las tablas se han creado correctamente:

1. Ve a la sección "Table Editor"
2. Deberías ver las tablas `profiles` y `notifications`
3. Verifica que las columnas coincidan con las definiciones anteriores

## Configuración de Webhooks en WooCommerce

Para que las notificaciones de pedidos funcionen correctamente, es necesario configurar un webhook en WooCommerce que envíe actualizaciones a tu aplicación cuando cambie el estado de un pedido.

La aplicación ya está configurada para registrar automáticamente este webhook cuando se inicia, pero puedes verificarlo manualmente en el panel de administración de WooCommerce:

1. Ve a WooCommerce > Ajustes > Avanzado > Webhooks
2. Debería haber un webhook llamado "Actualización de pedidos en la app"
3. La URL de entrega debe apuntar a tu endpoint de webhooks (configurado en `_layout.tsx`)
4. El tema debe ser "order.updated"
5. El estado debe ser "Activo"

Si no ves este webhook, la aplicación intentará crearlo automáticamente la próxima vez que se inicie.
