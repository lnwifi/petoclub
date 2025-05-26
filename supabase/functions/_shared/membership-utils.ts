import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const PROJECT_URL = Deno.env.get('PROJECT_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const MEMBERSHIP_TYPES = {
  PREMIUM: 'd83b7eb6-1c27-4fbd-aa0e-aad7d905066c',
  FREE: 'd7d719d1-482d-41a9-941b-027e794dd67f'
} as const

// Cliente de Supabase con permisos de administrador
const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function checkAndUpdateMembership(userId: string) {
  try {
    // 1. Obtener la membresía activa del usuario
    const { data: membership, error } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // Si no hay membresía activa, retornar null o crear una gratuita
    if (!membership) {
      return await createFreeMembership(userId)
    }

    // 2. Verificar si la membresía está vencida
    const now = new Date()
    const endDate = new Date(membership.end_date)
    
    if (endDate < now) {
      // 3. Si está vencida, actualizar a membresía gratuita
      return await updateToFreeMembership(userId, membership.id)
    }

    // 4. Si la membresía es válida, retornarla
    return membership

  } catch (error) {
    console.error('Error al verificar membresía:', error)
    throw error
  }
}

async function createFreeMembership(userId: string) {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('user_memberships')
    .insert([{
      user_id: userId,
      membership_type_id: MEMBERSHIP_TYPES.FREE,
      is_active: true,
      start_date: now,
      created_at: now,
      updated_at: now,
      type: 'free'
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateToFreeMembership(userId: string, membershipId: string) {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('user_memberships')
    .update({
      membership_type_id: MEMBERSHIP_TYPES.FREE,
      is_active: true,
      updated_at: now,
      end_date: null,
      type: 'free'
    })
    .eq('id', membershipId)
    .select()
    .single()

  if (error) throw error
  return data
}
