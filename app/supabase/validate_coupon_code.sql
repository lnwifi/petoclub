-- SQL para crear la función RPC en Supabase
create or replace function validate_coupon_code(
  place_id uuid,
  user_id uuid,
  coupon_id uuid,
  redeem_code text
)
returns jsonb
language plpgsql
as $$
declare
  coupon_record record;
begin
  -- Verifica que el local existe
  if not exists (select 1 from places where id = place_id) then
    return jsonb_build_object('valid', false, 'message', 'El local no existe');
  end if;

  -- Busca el canje pendiente para ese usuario/cupón/local/código
  select * into coupon_record
  from user_coupons
  where place_id = place_id and user_id = user_id and coupon_id = coupon_id and redeem_code = redeem_code
    and redeemed_at is null
    and expires_at > now();

  if coupon_record is null then
    return jsonb_build_object('valid', false, 'message', 'Código inválido o expirado');
  end if;

  -- Marca como canjeado
  update user_coupons set redeemed_at = now()
  where id = coupon_record.id;

  return jsonb_build_object('valid', true, 'message', 'Cupón canjeado');
end;
$$;
