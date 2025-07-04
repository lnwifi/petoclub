// Supabase Edge Function: mercadopago_webhook
// Recibe notificaciones de MercadoPago y actualiza la membresía del usuario en Supabase

// @ts-ignore - Ignorar error de importación de Deno en el editor
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// @ts-ignore - Ignorar error de Deno en el editor
const PROJECT_URL = Deno.env.get('PROJECT_URL');
// @ts-ignore
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
// @ts-ignore
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

// IDs de tipos de membresías
const MEMBERSHIP_TYPES = {
  PREMIUM: 'd83b7eb6-1c27-4fbd-aa0e-aad7d905066c',
  FREE: 'd7d719d1-482d-41a9-941b-027e794dd67f'
} as const;

// Alias para mantener compatibilidad con el código existente
const PREMIUM_MEMBERSHIP_TYPE_ID = MEMBERSHIP_TYPES.PREMIUM;
const FREE_MEMBERSHIP_TYPE_ID = MEMBERSHIP_TYPES.FREE;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Definir el tipo para el request
interface WebhookRequest {
  method: string;
  json: () => Promise<any>;
}

serve(async (req: WebhookRequest) => {
  console.log('INICIO WEBHOOK');
  
  try {
    // Manejo de preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Método no permitido', { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    console.log('BODY RECIBIDO:', JSON.stringify(body));
    const { type, data, topic, resource } = body;

    // --- FLUJO PARA PAGOS ---
    if ((type === 'payment' || topic === 'payment') && (data?.id || resource)) {
      const payment_id = data?.id || resource;
      console.log('payment_id:', payment_id);
      
      // Obtener detalles del pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const mpData = await mpRes.json();
      console.log('Datos del pago:', JSON.stringify(mpData));

      if (!mpRes.ok) {
        console.error('Error consultando pago:', mpData);
        return new Response('Error al consultar pago', { status: 400, headers: corsHeaders });
      }

      if (mpData.status === 'approved' && mpData.metadata) {
        const { tipo, user_id, id, days } = mpData.metadata;
        console.log('metadata:', mpData.metadata);

        // --- FLUJO DESTACAR MASCOTA ---
        if (tipo === 'destacar_mascota' && id) {
          const featured_until = new Date(Date.now() + ((days || 7) * 24 * 60 * 60 * 1000)).toISOString();
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/pets?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              featured_until,
              updated_at: new Date().toISOString(),
            })
          });
          if (!updateRes.ok) {
            console.error('Error actualizando mascota destacada:', await updateRes.text());
            return new Response('Error al actualizar mascota', { status: 500, headers: corsHeaders });
          }
          console.log('Mascota destacada exitosamente');
          return new Response('Mascota destacada exitosamente', { status: 200, headers: corsHeaders });
        }

        // --- FLUJO DESTACAR AVISO/LOCAL ---
        else if ((tipo === 'destacar_aviso' || tipo === 'destacar_local') && id) {
          const featured_until = new Date(Date.now() + ((days || 7) * 24 * 60 * 60 * 1000)).toISOString();
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/red_de_ayuda?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              featured_until,
              updated_at: new Date().toISOString(),
            })
          });
          if (!updateRes.ok) {
            console.error('Error actualizando aviso destacado:', await updateRes.text());
            return new Response('Error al actualizar aviso', { status: 500, headers: corsHeaders });
          }
          console.log('Aviso destacado exitosamente');
          return new Response('Aviso destacado exitosamente', { status: 200, headers: corsHeaders });
        }

        // --- FLUJO MEMBRESÍA ---
        else if (tipo === 'membresia' && user_id) {
          const now = new Date();
          const nowISO = now.toISOString();
          const membershipTypeId = MEMBERSHIP_TYPES.PREMIUM;
          const end_date = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          
          // Buscar si ya existe una membresía para este usuario
          const existingMembershipRes = await fetch(
            `${PROJECT_URL}/rest/v1/user_memberships?user_id=eq.${user_id}&select=*`,
            {
              headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              },
            }
          );
          
          const existingMemberships = await existingMembershipRes.json();
          let upsertRes;
          
          if (existingMemberships && existingMemberships.length > 0) {
            // Actualizar membresía existente
            const membershipId = existingMemberships[0].id;
            const updateData: Record<string, any> = {
              membership_type_id: membershipTypeId,
              is_active: true,
              updated_at: nowISO,
              end_date,
              type: 'pago_unico'
            };
            
            upsertRes = await fetch(
              `${PROJECT_URL}/rest/v1/user_memberships?id=eq.${membershipId}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify(updateData)
              }
            );
          } else {
            // Crear nueva membresía
            const newMembership: Record<string, any> = {
              user_id: user_id,
              membership_type_id: membershipTypeId,
              start_date: nowISO,
              is_active: true,
              created_at: nowISO,
              updated_at: nowISO,
              end_date,
              type: 'pago_unico'
            };
            
            upsertRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships`, {
              method: 'POST',
              headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(newMembership)
            });
          }
          
          if (!upsertRes.ok) {
            const errorData = await upsertRes.text();
            console.error('Error actualizando/creando membresía premium:', errorData);
            return new Response('Error al actualizar membresía premium', { status: 500, headers: corsHeaders });
          }
          
          console.log('Membresía premium actualizada/creada para el usuario:', user_id);
          return new Response('Membresía premium actualizada/renovada', { status: 200, headers: corsHeaders });
        }
        
        // --- FLUJO TIENDA ---
        else if (tipo === 'tienda') {
          // Aquí deberías agregar la lógica para registrar la compra en la tabla de compras si tienes una
          console.log('Pago de tienda recibido. Procesar lógica de tienda aquí.');
          return new Response('Pago de tienda procesado', { status: 200, headers: corsHeaders });
        }
        
        // Si el tipo no es reconocido
        else {
          console.log('Tipo de metadata no reconocido:', tipo);
          return new Response('Tipo de pago no manejado', { status: 200, headers: corsHeaders });
        }
      }
      
      // Si el pago no está aprobado o no tiene metadata
      console.log('Pago no aprobado o sin metadata válida');
      return new Response('Pago recibido, pero no aprobado o sin metadata válida', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // --- FLUJO MERCHANT_ORDER (para órdenes de tienda) ---
    if ((type === 'merchant_order' || topic === 'merchant_order') && resource) {
      const orderRes = await fetch(resource, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const orderData = await orderRes.json();
      // Aquí puedes agregar lógica para procesar la orden de la tienda
      console.log('merchant_order recibido. Procesar lógica de orden aquí.');
      return new Response('Orden procesada', { status: 200, headers: corsHeaders });
    }

    // Si el tipo de evento no es manejado
    console.log('Evento no manejado:', type || topic);
    return new Response('Evento no manejado', { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error en el webhook:', error);
    return new Response('Error interno del servidor', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
