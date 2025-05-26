// @ts-nocheck
// Supabase Edge Function: create_subscription
// Crea una suscripción (preapproval) en MercadoPago para membresía premium
// Variables de entorno: MP_ACCESS_TOKEN, PROJECT_URL

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
const PROJECT_URL = Deno.env.get('PROJECT_URL');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405, headers: corsHeaders });
  }

  try {
    // LOG: Variables de entorno
    console.log('DEBUG MP_ACCESS_TOKEN:', MP_ACCESS_TOKEN ? MP_ACCESS_TOKEN.substring(0, 6) + '...' : 'NO DEFINIDO');
    console.log('DEBUG PROJECT_URL:', PROJECT_URL);

    // LOG: Body recibido
    const body = await req.json();
    console.log('DEBUG BODY RECIBIDO:', body);
    const { payer_email, reason, amount, frequency = 1, frequency_type = 'months', back_url, metadata = {} } = body;

    if (!payer_email || !reason || !amount) {
      console.log('DEBUG ERROR: Faltan parámetros requeridos', { payer_email, reason, amount });
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), { status: 400, headers: corsHeaders });
    }

    const preapprovalPayload = {
      reason,
      auto_recurring: {
        frequency,
        frequency_type,
        transaction_amount: amount,
        currency_id: 'ARS',
      },
      payer_email,
      back_url: back_url || 'https://petoclub.com/memberships-success',
      notification_url: `${PROJECT_URL}/functions/v1/mercadopago_webhook`,
      metadata,
    };

    // LOG: Payload enviado a MercadoPago
    console.log('DEBUG PREAPPROVAL PAYLOAD:', preapprovalPayload);

    const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preapprovalPayload),
    });

    // LOG: Status y body de la respuesta de MercadoPago
    console.log('DEBUG MP RESPONSE STATUS:', preapprovalRes.status);
    const preapprovalText = await preapprovalRes.text();
    console.log('DEBUG MP RESPONSE BODY:', preapprovalText);
    let preapprovalData;
    try {
      preapprovalData = JSON.parse(preapprovalText);
    } catch (e) {
      preapprovalData = { error: 'Respuesta no es JSON', raw: preapprovalText };
    }

    if (!preapprovalRes.ok || !preapprovalData.init_point) {
      return new Response(JSON.stringify({ error: preapprovalData.message || preapprovalData.error || 'No se pudo crear la suscripción', mp_status: preapprovalRes.status, mp_body: preapprovalData }), { status: 500, headers: corsHeaders });
    }

    // Guardar payer_id en el perfil si está disponible
    if (preapprovalData.payer_id && payer_email) {
      // Buscar el usuario por email
      const userRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?email=eq.${payer_email}`, {
        headers: {
          'apikey': Deno.env.get('SERVICE_ROLE_KEY'),
          'Authorization': `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`,
        },
      });
      const users = await userRes.json();
      if (Array.isArray(users) && users.length > 0) {
        const user_id = users[0].id;
        await fetch(`${PROJECT_URL}/rest/v1/profiles?id=eq.${user_id}`, {
          method: 'PATCH',
          headers: {
            'apikey': Deno.env.get('SERVICE_ROLE_KEY'),
            'Authorization': `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payer_id: preapprovalData.payer_id })
        });
        console.log('payer_id actualizado en profile para', payer_email);
      } else {
        console.log('No se encontró usuario para actualizar payer_id:', payer_email);
      }
    }

    return new Response(JSON.stringify({
      init_point: preapprovalData.init_point,
      id: preapprovalData.id,
      status: preapprovalData.status,
      preapproval: preapprovalData,
    }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: e.message }), { status: 500, headers: corsHeaders });
  }
});
