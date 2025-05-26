-- Agrega la columna payer_id a la tabla profiles para asociar usuarios de MercadoPago
ALTER TABLE profiles ADD COLUMN payer_id TEXT;
-- (Opcional) Si quieres asegurar unicidad, puedes agregar un índice único (descomenta la siguiente línea):
-- CREATE UNIQUE INDEX IF NOT EXISTS profiles_payer_id_idx ON profiles(payer_id);
