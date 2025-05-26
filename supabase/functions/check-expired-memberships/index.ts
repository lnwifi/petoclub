import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const PROJECT_URL = Deno.env.get('PROJECT_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const MEMBERSHIP_TYPES = {
  PREMIUM: 'd83b7eb6-1c27-4fbd-aa0e-aad7d905066c',
  FREE: 'd7d719d1-482d-41a9-941b-027e794dd67f'
} as const

const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Esta función se ejecutará según el cron programado
async function checkAndUpdateExpiredMemberships() {
  const now = new Date().toISOString()
  
  console.log(`[${new Date().toISOString()}] Iniciando verificación de membresías vencidas...`)
  
  try {
    // 1. Obtener todas las membresías premium vencidas
    const { data: expiredMemberships, error } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('is_active', true)
      .eq('membership_type_id', MEMBERSHIP_TYPES.PREMIUM)
      .lt('end_date', now)
    
    if (error) throw error
    
    console.log(`[${new Date().toISOString()}] Encontradas ${expiredMemberships.length} membresías vencidas`)
    
    // 2. Actualizar cada membresía vencida
    let updatedCount = 0
    
    for (const membership of expiredMemberships) {
      const { error: updateError } = await supabase
        .from('user_memberships')
        .update({
          membership_type_id: MEMBERSHIP_TYPES.FREE,
          is_active: true,
          end_date: null,
          type: 'free',
          updated_at: now
        })
        .eq('id', membership.id)
      
      if (updateError) {
        console.error(`Error actualizando membresía ${membership.id}:`, updateError)
      } else {
        updatedCount++
        console.log(`[${new Date().toISOString()}] Usuario ${membership.user_id} actualizado a membresía gratuita`)
      }
    }
    
    return {
      success: true,
      message: `Se actualizaron ${updatedCount} de ${expiredMemberships.length} membresías vencidas`
    }
    
  } catch (error) {
    console.error('Error en checkAndUpdateExpiredMemberships:', error)
    throw error
  }
}

// Handler para la función de borde
serve(async (req) => {
  // Solo permitir solicitudes del programador de tareas de Supabase
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    const result = await checkAndUpdateExpiredMemberships()
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en la función:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
