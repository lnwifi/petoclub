-- Tabla para registrar los canjes de cupones por usuario
CREATE TABLE IF NOT EXISTS public.user_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_redeemed BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id, coupon_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON public.user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON public.user_coupons(coupon_id);

-- Política RLS: solo el propio usuario puede ver sus canjes
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own coupon redemptions" ON public.user_coupons
    FOR SELECT USING (auth.uid() = user_id);

-- Función RPC para canjear cupón
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_user_id UUID, p_coupon_id UUID)
RETURNS TABLE (
  code TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN
) AS $$
DECLARE
  existing public.user_coupons%ROWTYPE;
  new_code TEXT;
BEGIN
  -- Buscar canje existente
  SELECT * INTO existing FROM public.user_coupons
    WHERE user_id = p_user_id AND coupon_id = p_coupon_id
    ORDER BY redeemed_at DESC LIMIT 1;

  IF FOUND AND existing.expires_at > now() THEN
    RETURN QUERY SELECT existing.code, existing.redeemed_at, existing.expires_at, FALSE;
  ELSIF FOUND AND existing.expires_at <= now() THEN
    RETURN QUERY SELECT existing.code, existing.redeemed_at, existing.expires_at, TRUE;
  ELSE
    -- Generar código aleatorio de 10 caracteres
    new_code := substring(upper(md5(random()::text)) from 1 for 10);
    INSERT INTO public.user_coupons (user_id, coupon_id, code, redeemed_at, expires_at, is_redeemed)
    VALUES (p_user_id, p_coupon_id, new_code, now(), now() + interval '15 minutes', TRUE);
    RETURN QUERY SELECT new_code, now(), now() + interval '15 minutes', FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir uso de la función a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.redeem_coupon(UUID, UUID) TO authenticated;
