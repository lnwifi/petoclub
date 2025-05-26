// Backend intermedio para Mercado Pago Suscripciones + Supabase
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Configura Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// Configura Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Endpoint para crear suscripción
app.post('/subscribe', async (req, res) => {
  const { email, user_id } = req.body;
  try {
    const preapproval = await mercadopago.preapproval.create({
      reason: "Membresía Premium PetoClub",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 999, // Monto en ARS
        currency_id: "ARS"
      },
      back_url: "https://tu-app.com/suscripcion-exitosa",
      payer_email: email
    });

    // Guarda la suscripción en Supabase
    await supabase.from('user_subscriptions').insert([
      {
        user_id,
        status: 'pending',
        mercado_pago_preapproval_id: preapproval.body.id,
        next_payment_date: preapproval.body.auto_recurring.end_date
      }
    ]);

    res.json({ init_point: preapproval.body.init_point });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para crear preferencia de pago para destacar locales o mascotas
app.post('/highlight', async (req, res) => {
  const { tipo, id, days, price, title } = req.body; // tipo: 'local' o 'mascota', id: placeId o petId
  try {
    const preference = await mercadopago.preferences.create({
      items: [{
        title: title || (tipo === 'local' ? 'Destacar Local' : 'Destacar Mascota'),
        quantity: 1,
        currency_id: 'ARS',
        unit_price: price || 999,
      }],
      back_urls: {
        success: 'https://tu-app.com/destacado-exitoso',
        failure: 'https://tu-app.com/destacado-error',
        pending: 'https://tu-app.com/destacado-pendiente',
      },
      auto_return: 'approved',
      metadata: {
        tipo: tipo === 'local' ? 'destacar_local' : 'destacar_mascota',
        id, // placeId o petId
        days: days || 7
      }
    });
    res.json({ init_point: preference.body.init_point });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para recibir webhooks de Mercado Pago
app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  if (type === 'preapproval') {
    try {
      const mpRes = await mercadopago.preapproval.findById(data.id);
      const preapproval = mpRes.body;
      await supabase
        .from('user_subscriptions')
        .update({
          status: preapproval.status, // authorized, paused, cancelled, etc.
          next_payment_date: preapproval.auto_recurring ? preapproval.auto_recurring.end_date : null
        })
        .eq('mercado_pago_preapproval_id', preapproval.id);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (type === 'payment') {
    try {
      const mpRes = await mercadopago.payment.findById(data.id);
      const payment = mpRes.body;
      if (payment.status === 'approved' && payment.metadata) {
        const { tipo, id, days } = payment.metadata;
        const featured_until = new Date(Date.now() + (days || 7) * 24 * 60 * 60 * 1000).toISOString();
        if (tipo === 'destacar_local') {
          await supabase.from('places').update({ featured: true, featured_until }).eq('id', id);
        } else if (tipo === 'destacar_mascota') {
          await supabase.from('pets').update({ featured: true, featured_until }).eq('id', id);
        }
      }
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.sendStatus(200);
  }
});

// Endpoint simple para verificar que el backend funciona
app.get('/', (req, res) => {
  res.send('Backend Mercado Pago + Supabase OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor escuchando en puerto', PORT);
});
