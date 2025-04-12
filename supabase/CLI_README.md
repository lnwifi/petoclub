# Configuración de la Base de Datos con Supabase CLI

Este documento proporciona instrucciones para configurar la base de datos en Supabase utilizando la CLI (Command Line Interface) para la aplicación Pet Club.

## Requisitos previos

1. Tener Node.js instalado (versión 14 o superior)
2. Tener la CLI de Supabase instalada globalmente
   ```
   npm install -g supabase
   ```
3. Haber iniciado sesión en Supabase CLI
   ```
   supabase login
   ```
4. Tener acceso al proyecto de Supabase configurado en `lib/supabase.ts`

## Estructura de archivos

Esta carpeta contiene los siguientes archivos importantes:

- `init.sql`: Script SQL completo que crea la tabla de mascotas y configura las políticas de seguridad
- `setup.js`: Script de Node.js que ejecuta el archivo SQL utilizando la CLI de Supabase
- `migrations/`: Carpeta que contiene scripts SQL individuales para migraciones específicas
- `sql/`: Carpeta con scripts SQL adicionales para referencia

## Pasos para configurar la base de datos

### Opción 1: Usando el script de configuración automatizado

1. Asegúrate de estar en la carpeta raíz del proyecto
2. Ejecuta el script de configuración:
   ```
   node supabase/setup.js
   ```
3. El script ejecutará automáticamente todas las configuraciones necesarias

### Opción 2: Ejecutando el script SQL manualmente

1. Asegúrate de tener la CLI de Supabase instalada y configurada
2. Ejecuta el siguiente comando:
   ```
   supabase db execute --file "supabase/init.sql"
   ```

### Opción 3: Usando el Editor SQL de Supabase

Si prefieres usar la interfaz web de Supabase:

1. Inicia sesión en [Supabase](https://supabase.com)
2. Selecciona tu proyecto (Petoclub)
3. En el menú lateral, haz clic en "SQL Editor"
4. Crea un nuevo script SQL
5. Copia y pega el contenido del archivo `init.sql`
6. Ejecuta el script

## Verificación

Para verificar que la configuración se ha realizado correctamente:

1. En el menú lateral de Supabase, ve a "Table Editor" y confirma que existe la tabla "pets" con la estructura correcta
2. Ve a "Storage" y confirma que existe el bucket "pet-images"
3. Prueba la funcionalidad de agregar mascotas en la aplicación

## Estructura de la tabla pets

| Columna      | Tipo                    | Descripción                           |
|--------------|-------------------------|---------------------------------------|
| id           | UUID                    | Identificador único de la mascota     |
| owner_id     | UUID                    | ID del usuario propietario            |
| name         | TEXT                    | Nombre de la mascota                  |
| species      | TEXT                    | Especie (perro, gato, etc.)           |
| breed        | TEXT                    | Raza (opcional)                       |
| age          | TEXT                    | Edad (opcional)                       |
| description  | TEXT                    | Descripción (opcional)                 |
| image_url    | TEXT                    | URL de la imagen (opcional)           |
| created_at   | TIMESTAMP WITH TIME ZONE| Fecha de creación                     |
| updated_at   | TIMESTAMP WITH TIME ZONE| Fecha de última actualización         |

## Políticas de seguridad

El script configura las siguientes políticas de seguridad:

1. Los usuarios solo pueden ver sus propias mascotas
2. Los usuarios solo pueden insertar mascotas donde ellos sean los propietarios
3. Los usuarios solo pueden actualizar sus propias mascotas
4. Los usuarios solo pueden eliminar sus propias mascotas
5. Los usuarios autenticados pueden subir imágenes al bucket "pet-images"
6. Cualquier usuario puede ver las imágenes en el bucket "pet-images"