// @ts-nocheck
// Supabase Edge Function: create_payment_preference
// Crea una preferencia de pago en Mercado Pago para destacar locales o mascotas
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
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { tipo, id, days, price, title, user_id } = body;

    // Pago único de membresía premium
    if (tipo === 'membresia') {
      price = 2500;
      days = 30;
      title = title || 'Membresía Premium 30 días';
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Falta user_id para membresía' }), { status: 400, headers: corsHeaders });
      }
    }

    if (!tipo || ((tipo !== 'membresia') && (!id || !days || !price || !title))) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), { status: 400, headers: corsHeaders });
    }

    // Crear preferencia de pago en Mercado Pago
    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            title,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: price,
          },
        ],
        metadata: tipo === 'membresia'
          ? { tipo: 'membresia', user_id, days }
          : { tipo: tipo === 'local' ? 'destacar_local' : 'destacar_mascota', id, days },
        notification_url: `${PROJECT_URL}/functions/v1/mercadopago_webhook`,
        back_urls: {
          success: 'https://petoclub.com/success',
          failure: 'https://petoclub.com/failure',
          pending: 'https://petoclub.com/pending',
        },
        auto_return: 'approved',
      }),
    });

    const prefData = await preferenceRes.json();
    if (!preferenceRes.ok || !prefData.init_point) {
      return new Response(JSON.stringify({ error: prefData.message || 'No se pudo crear la preferencia' }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ init_point: prefData.init_point }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
