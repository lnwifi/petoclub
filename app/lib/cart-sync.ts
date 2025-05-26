import { supabase } from './supabase';

/**
 * Guarda el carrito persistente en Supabase para el usuario actual
 * @param userId UUID del usuario Supabase
 * @param cart Array de productos
 */
export async function saveCartToSupabase(userId: string, cart: any[]) {
  if (!userId) return;
  await supabase.from('user_carts').upsert([
    { user_id: userId, cart, updated_at: new Date().toISOString() }
  ]);
}

/**
 * Obtiene el carrito persistente desde Supabase para el usuario actual
 * @param userId UUID del usuario Supabase
 */
export async function getCartFromSupabase(userId: string): Promise<any[] | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_carts')
    .select('cart')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data.cart || [];
}
