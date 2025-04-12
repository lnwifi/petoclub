# Pet Club App

## Configuración de Supabase

Esta aplicación utiliza Supabase para la autenticación y almacenamiento de datos. Sigue estos pasos para configurar Supabase en tu proyecto:

1. Crea una cuenta en [Supabase](https://supabase.com) si aún no tienes una.
2. Crea un nuevo proyecto en Supabase.
3. Una vez creado el proyecto, ve a la sección **Settings > API** en el panel de control.
4. Copia la **URL** y la **anon key** (clave anónima).
5. Abre el archivo `lib/supabase.ts` en tu proyecto.
6. Reemplaza los valores de `supabaseUrl` y `supabaseAnonKey` con tus credenciales:

```typescript
const supabaseUrl = 'TU_URL_DE_SUPABASE';
const supabaseAnonKey = 'TU_CLAVE_ANONIMA_DE_SUPABASE';
```

## Funcionalidades implementadas

- **Autenticación de usuarios**: Registro, inicio de sesión y cierre de sesión.
- **Recuperación de contraseña**: Envío de correo para restablecer contraseña.
- **Protección de rutas**: Solo usuarios autenticados pueden acceder a ciertas partes de la aplicación.
- **Perfil de usuario**: Visualización de información del usuario y opción para cerrar sesión.

## Estructura del proyecto

- `lib/supabase.ts`: Configuración y funciones de Supabase.
- `lib/auth-context.tsx`: Contexto de autenticación para gestionar el estado del usuario.
- `lib/auth-route.tsx`: Componente para proteger rutas basado en el estado de autenticación.
- `app/(auth)/`: Pantallas de autenticación (login, registro, recuperación de contraseña).
- `app/(app)/`: Pantallas principales de la aplicación, protegidas por autenticación.

## Ejecución del proyecto

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```