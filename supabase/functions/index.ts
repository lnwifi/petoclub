// @ts-nocheck
// Supabase Edge Function: mercadopago_webhook
// Recibe notificaciones de MercadoPago y actualiza la membresía del usuario en Supabase
// Variables de entorno: PROJECT_URL, SERVICE_ROLE_KEY, MP_ACCESS_TOKEN

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const PROJECT_URL = Deno.env.get('PROJECT_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
const PREMIUM_MEMBERSHIP_TYPE_ID = 'd83b7eb6-1c27-4fbd-aa0e-aad7d905066c'; // Reemplaza por el ID real de tu membresía premium

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  console.log('INICIO WEBHOOK'); // LOG DE INICIO

  // Manejo de preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Método no permitido:', req.method);
    return new Response('Método no permitido', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('BODY RECIBIDO:', JSON.stringify(body));
    const { type, data } = body;

    // --- SOPORTE PARA SUSCRIPCIÓN RECURRENTE ---
    if (type === 'subscription_authorized_payment') {
  // 1. Obtener el payment_id del body
  const payment_id = data.id;
  console.log('subscription_authorized_payment, payment_id:', payment_id);
  // 2. Consultar el pago en MercadoPago
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
    },
  });
  const mpData = await mpRes.json();
  console.log('mpData subscription payment:', JSON.stringify(mpData));
  if (!mpRes.ok) {
    console.error('Error consultando payment', mpData);
    return new Response(JSON.stringify({ error: 'No se pudo consultar el pago' }), { status: 500, headers: corsHeaders });
  }
  // 3. Validar pago aprobado y buscar preapproval_id
  if (mpData.status === 'approved' && mpData.metadata && mpData.metadata.preapproval_id) {
    const preapproval_id = mpData.metadata.preapproval_id;
    let payer_email = mpData.payer && mpData.payer.email;
    let payer_id = mpData.payer_id;
    console.log('preapproval_id:', preapproval_id, 'payer_email:', payer_email, 'payer_id:', payer_id);
    // Buscar usuario por email
    let user_id = null;
    if (payer_email) {
      const userRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?email=eq.${payer_email}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const users = await userRes.json();
      console.log('profiles by email:', JSON.stringify(users));
      if (userRes.ok && users.length > 0) {
        user_id = users[0].id;
      }
    }
    // Si no se encontró por email, buscar por payer_id
    if (!user_id && payer_id) {
      const userRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?payer_id=eq.${payer_id}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const users = await userRes.json();
      console.log('profiles by payer_id:', JSON.stringify(users));
      if (userRes.ok && users.length > 0) {
        user_id = users[0].id;
      }
    }
    if (!user_id) {
      console.error('Usuario no encontrado por email ni payer_id para suscripción.');
      return new Response(JSON.stringify({ error: 'Usuario no encontrado por email ni payer_id' }), { status: 404, headers: corsHeaders });
    }
    // 5. Buscar membresía premium activa existente
    const membershipRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships?user_id=eq.${user_id}&type=eq.premium`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const memberships = await membershipRes.json();
    const now = new Date();
    let newStartDate = now.toISOString();
    let newEndDate;
    if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].end_date && new Date(memberships[0].end_date) > now) {
      // Renovación: sumar 30 días a end_date actual
      const prevEnd = new Date(memberships[0].end_date);
      newEndDate = new Date(prevEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      newStartDate = memberships[0].start_date || now.toISOString();
    } else {
      // Nueva membresía o vencida: 30 días desde ahora
      newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    // PATCH si existe, sino POST
    if (Array.isArray(memberships) && memberships.length > 0) {
      // Actualiza membresía existente
      const updateRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships?id=eq.${memberships[0].id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: newStartDate,
          end_date: newEndDate,
          updated_at: now.toISOString(),
          type: 'premium',
        })
      });
      const updateData = await updateRes.json();
      console.log('updateData:', JSON.stringify(updateData));
    } else {
      // Crea nueva membresía premium
      const insertRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id,
          type: 'premium',
          start_date: newStartDate,
          end_date: newEndDate,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
      });
      const insertData = await insertRes.json();
      console.log('insertData:', JSON.stringify(insertData));
    }
    return new Response('Membresía premium actualizada/renovada (subscription)', { status: 200, headers: corsHeaders });
  }
  return new Response('Pago de suscripción no aprobado o sin metadata', { status: 200, headers: corsHeaders });
}
      // 1. Obtener el payment_id del body
      const payment_id = data.id;
      console.log('subscription_authorized_payment, payment_id:', payment_id);
      // 2. Consultar el pago en MercadoPago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        },
      });
      const mpData = await mpRes.json();
      console.log('mpData subscription payment:', JSON.stringify(mpData));
      if (!mpRes.ok) {
        console.error('Error consultando payment', mpData);
        return new Response(JSON.stringify({ error: 'No se pudo consultar el pago' }), { status: 500, headers: corsHeaders });
      }
      // 3. Validar pago aprobado y buscar preapproval_id
      if (mpData.status === 'approved' && mpData.metadata && mpData.metadata.preapproval_id) {
        const preapproval_id = mpData.metadata.preapproval_id;
        const payer_email = mpData.payer && mpData.payer.email;
        console.log('preapproval_id:', preapproval_id, 'payer_email:', payer_email);
        // 4. Buscar el usuario por email
        let user_id = null;
        if (payer_email) {
          const userRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?email=eq.${payer_email}`, {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          });
          const users = await userRes.json();
          console.log('profiles:', JSON.stringify(users));
          if (userRes.ok && users.length > 0) {
            user_id = users[0].id;
          }
        }
        // Si no se encontró por email, buscar por preapproval_id (si lo guardaste antes en profiles)
        // Aquí puedes agregar lógica extra si lo necesitas
        if (!user_id) {
          console.error('Usuario no encontrado por email para suscripción.');
          return new Response(JSON.stringify({ error: 'Usuario no encontrado por email' }), { status: 404, headers: corsHeaders });
        }
        // 5. Buscar membresía premium activa existente
        const membershipRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships?user_id=eq.${user_id}&type=eq.premium`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const memberships = await membershipRes.json();
        const now = new Date();
        let newStartDate = now.toISOString();
        let newEndDate;
        if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].end_date && new Date(memberships[0].end_date) > now) {
          // Renovación: sumar 30 días a end_date actual
          const prevEnd = new Date(memberships[0].end_date);
          newEndDate = new Date(prevEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          newStartDate = memberships[0].start_date || now.toISOString();
        } else {
          // Nueva membresía o vencida: 30 días desde ahora
          newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        // PATCH si existe, sino POST
        if (Array.isArray(memberships) && memberships.length > 0) {
          // Actualiza membresía existente
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships?id=eq.${memberships[0].id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              start_date: newStartDate,
              end_date: newEndDate,
              updated_at: now.toISOString(),
              type: 'premium',
            })
          });
          const updateData = await updateRes.json();
          console.log('updateData:', JSON.stringify(updateData));
        } else {
          // Crea nueva membresía premium
          const insertRes = await fetch(`${PROJECT_URL}/rest/v1/user_memberships`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id,
              type: 'premium',
              start_date: newStartDate,
              end_date: newEndDate,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
          });
          const insertData = await insertRes.json();
          console.log('insertData:', JSON.stringify(insertData));
        }
        return new Response('Membresía premium actualizada/renovada (subscription)', { status: 200, headers: corsHeaders });
      }
      return new Response('Pago de suscripción no aprobado o sin metadata', { status: 200, headers: corsHeaders });
    }
    // --- FIN SOPORTE SUSCRIPCIÓN RECURRENTE ---

    // --- SOPORTE PARA subscription_preapproval ---
    if (type === 'subscription_preapproval') {
      // Solo loguear, no actualizar membresía
      const preapproval_id = data.id;
      console.log('subscription_preapproval recibido, preapproval_id:', preapproval_id);
      return new Response('Evento preapproval recibido (sin acción de membresía)', { status: 200, headers: corsHeaders });
    }
    // --- FIN SOPORTE subscription_preapproval ---

    console.log('Evento no manejado:', type);
    return new Response('Evento no manejado', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error en el webhook:', error);
    return new Response('Error interno del servidor', { status: 500, headers: corsHeaders });
  }
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const users = await userRes.json();
        console.log('profiles:', JSON.stringify(users));
        if (!userRes.ok || users.length === 0) {
          console.error('Usuario no encontrado por email');
          return new Response(JSON.stringify({ error: 'Usuario no encontrado por email' }), { status: 404, headers: corsHeaders });
        }
        const user_id = users[0].id;

        // 2. Buscar membresía premium activa existente
        const membershipRes = await fetch(`${PROJECT_URL}/rest/v1/user_membership?user_id=eq.${user_id}&membership_type_id=eq.${PREMIUM_MEMBERSHIP_TYPE_ID}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const memberships = await membershipRes.json();
        const now = new Date();
        let newStartDate = now.toISOString();
        let newEndDate;
        if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].end_date && new Date(memberships[0].end_date) > now) {
          // Renovación: sumar 30 días a end_date actual
          const prevEnd = new Date(memberships[0].end_date);
          newEndDate = new Date(prevEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          newStartDate = memberships[0].start_date || now.toISOString();
        } else {
          // Nueva membresía o vencida: 30 días desde ahora
          newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        // PATCH si existe, sino POST
        if (Array.isArray(memberships) && memberships.length > 0) {
          // Actualiza membresía existente
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/user_membership?id=eq.${memberships[0].id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              is_active: true,
              start_date: newStartDate,
              end_date: newEndDate,
              updated_at: now.toISOString(),
              type: 'premium',
            })
          });
          const updateData = await updateRes.json();
          console.log('updateData:', JSON.stringify(updateData));
        } else {
          // Crea nueva membresía premium
          const insertRes = await fetch(`${PROJECT_URL}/rest/v1/user_membership`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              user_id,
              membership_type_id: PREMIUM_MEMBERSHIP_TYPE_ID,
              is_active: true,
              start_date: newStartDate,
              end_date: newEndDate,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
              type: 'premium',
            })
          });
          const insertData = await insertRes.json();
          console.log('insertData:', JSON.stringify(insertData));
        }
        return new Response('Membresía premium actualizada/renovada', { status: 200, headers: corsHeaders });
      }
      // --- Manejo de cancelación de suscripción ---
      else if (
        mpData.status === 'cancelled' ||
        mpData.status === 'paused' ||
        mpData.status === 'expired'
      ) {
        const payer_email = mpData.payer_email;
        console.log('CANCEL preapproval para:', payer_email, 'status:', mpData.status);
        // Buscar usuario
        const userRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?email=eq.${payer_email}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const users = await userRes.json();
        if (!userRes.ok || users.length === 0) {
          console.error('Usuario no encontrado por email (cancel)');
          return new Response(JSON.stringify({ error: 'Usuario no encontrado por email' }), { status: 404, headers: corsHeaders });
        }
        const user_id = users[0].id;
        // Buscar membresía premium activa
        const membershipRes = await fetch(`${PROJECT_URL}/rest/v1/user_membership?user_id=eq.${user_id}&membership_type_id=eq.${PREMIUM_MEMBERSHIP_TYPE_ID}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const memberships = await membershipRes.json();
        if (Array.isArray(memberships) && memberships.length > 0) {
          // Marca la membresía como cancelada, pero NO cambia fechas ni desactiva
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/user_membership?id=eq.${memberships[0].id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              type: 'premium_cancelled',
              updated_at: new Date().toISOString(),
            })
          });
          const updateData = await updateRes.json();
          console.log('updateData cancel:', JSON.stringify(updateData));
        }
        return new Response('Membresía premium marcada como cancelada (vigente hasta end_date)', { status: 200, headers: corsHeaders });
      }
      return new Response('Preapproval no autorizado', { status: 200, headers: corsHeaders });
    }
    // --- SOPORTE PARA PAGOS DE DESTACAR LOCALES Y MASCOTAS ---
    if (type === 'payment') {
      const payment_id = data.id;
      console.log('payment_id:', payment_id);
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        },
      });
      const mpData = await mpRes.json();
      console.log('mpData payment:', JSON.stringify(mpData));
      if (!mpRes.ok) {
        console.error('Error consultando payment', mpData);
        return new Response(JSON.stringify({ error: 'No se pudo consultar el pago' }), { status: 500, headers: corsHeaders });
      }
      if (mpData.status && mpData.metadata) {
        const { tipo, id, days, order_id } = mpData.metadata;
        console.log('metadata:', mpData.metadata);
        const featured_until = new Date(Date.now() + ((days || 7) * 24 * 60 * 60 * 1000)).toISOString();

        // --- NUEVO: SOPORTE PARA PAGOS DE PEDIDOS WOOCOMMERCE ---
        if (tipo === 'woocommerce' && order_id) {
          console.log('Actualizando pedido WooCommerce:', order_id, 'Estado:', mpData.status);
          // Determinar el nuevo estado del pedido en WooCommerce
          let newStatus = '';
          if (mpData.status === 'approved') newStatus = 'processing';
          else if (mpData.status === 'pending') newStatus = 'pending';
          else if (mpData.status === 'rejected' || mpData.status === 'cancelled') newStatus = 'failed';
          else newStatus = 'on-hold';

          // Llamar a la API de WooCommerce para actualizar el pedido
          try {
            const WOOCOMMERCE_URL = Deno.env.get('WOOCOMMERCE_URL');
            const WOOCOMMERCE_KEY = Deno.env.get('WOOCOMMERCE_KEY');
            const WOOCOMMERCE_SECRET = Deno.env.get('WOOCOMMERCE_SECRET');
            const token = btoa(`${WOOCOMMERCE_KEY}:${WOOCOMMERCE_SECRET}`);
            const wcRes = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${order_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Basic ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: newStatus,
                customer_note: `Actualizado automáticamente por MercadoPago (${mpData.status})`
              })
            });
            const wcData = await wcRes.json();
            console.log('Respuesta WooCommerce:', wcData);
          } catch (err) {
            console.error('Error actualizando WooCommerce:', err);
          }

          // Registrar el pago
          await fetch(`${PROJECT_URL}/rest/v1/pagos`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aviso_id: order_id,
              tipo: 'woocommerce',
              monto: mpData.transaction_amount,
              estado: mpData.status,
              fecha: new Date().toISOString(),
              mercadopago_id: mpData.id,
              raw_response: mpData
            })
          });
          return new Response('Pedido WooCommerce actualizado', { status: 200, headers: corsHeaders });
        }
        // --- FIN SOPORTE WOOCOMMERCE ---

        if (tipo === 'destacar_local') {
          console.log('Destacando local:', id);
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/places?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              featured: true,
              featured_until,
            }),
          });
          const updateData = await updateRes.json();
          console.log('updateData local:', JSON.stringify(updateData));
          // Registrar en pagos
          await fetch(`${PROJECT_URL}/rest/v1/pagos`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aviso_id: id,
              tipo: 'local',
              monto: mpData.transaction_amount,
              estado: mpData.status,
              fecha: new Date().toISOString(),
              mercadopago_id: mpData.id,
              raw_response: mpData
            })
          });
          return new Response('Local destacado', { status: 200, headers: corsHeaders });
        }
        if (tipo === 'destacar_mascota') {
          console.log('Destacando mascota:', id);
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/pets?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              featured: true,
              featured_until,
            }),
          });
          const updateData = await updateRes.json();
          console.log('updateData mascota:', JSON.stringify(updateData));
          // Registrar en pagos
          await fetch(`${PROJECT_URL}/rest/v1/pagos`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aviso_id: id,
              tipo: 'mascota',
              monto: mpData.transaction_amount,
              estado: mpData.status,
              fecha: new Date().toISOString(),
              mercadopago_id: mpData.id,
              raw_response: mpData
            })
          });
          return new Response('Mascota destacada', { status: 200, headers: corsHeaders });
        }
        if (tipo === 'destacar_aviso') {
          console.log('Destacando aviso:', id);
          const updateRes = await fetch(`${PROJECT_URL}/rest/v1/red_de_ayuda?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              destacado: true,
              destacado_hasta: featured_until,
            }),
          });
          const updateData = await updateRes.json();
          console.log('updateData aviso:', JSON.stringify(updateData));
          // Registrar en pagos
          await fetch(`${PROJECT_URL}/rest/v1/pagos`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aviso_id: id,
              tipo: 'aviso',
              monto: mpData.transaction_amount,
              estado: mpData.status,
              fecha: new Date().toISOString(),
              mercadopago_id: mpData.id,
              raw_response: mpData
            })
          });
          return new Response('Aviso destacado', { status: 200, headers: corsHeaders });
        }
      }
      console.log('Pago no aprobado o sin metadata');
  }
  return new Response('Error desconocido', { status: 500, headers: corsHeaders });
});
