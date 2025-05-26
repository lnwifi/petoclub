-- Agregar columna owner_id para asociar un local a un usuario
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Permitir INSERT solo a admin (is_admin en profiles)
CREATE POLICY "Only admin can insert places" ON public.places
  FOR INSERT WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
  );

-- Permitir UPDATE solo al admin o al dueño del local
CREATE POLICY "Admin or owner can update place" ON public.places
  FOR UPDATE USING (
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
    OR owner_id = auth.uid()
  );
