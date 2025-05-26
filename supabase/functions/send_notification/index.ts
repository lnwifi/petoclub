// @ts-nocheck
// Supabase Edge Function: send_notification
// Inserta una notificación en la tabla y envía push vía Firebase Cloud Messaging
// Variables de entorno: SERVICE_ROLE_KEY, PROJECT_URL, FIREBASE_SERVICE_ACCOUNT

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
const PROJECT_URL = Deno.env.get('PROJECT_URL');
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

// Helper para convertir string base64 a ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Utilidad para obtener un access token de Google OAuth2 usando el service account
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hora
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };

  // Construye JWT
  const encoder = new TextEncoder();
  const header = { alg: "RS256", typ: "JWT" };
  function base64url(source: Uint8Array) {
    return btoa(String.fromCharCode(...source))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  const encode = (obj: any) => base64url(encoder.encode(JSON.stringify(obj)));
  const toSign = `${encode(header)}.${encode(payload)}`;

  // Firma JWT
  const key = await crypto.subtle.importKey(
    "pkcs8",
    str2ab(atob(serviceAccount.private_key.replace(/-----[^-]+-----/g, "").replace(/\n/g, ""))),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(toSign)
  );
  const jwt = `${toSign}.${base64url(new Uint8Array(signature))}`;

  // Intercambia JWT por access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("No se pudo obtener access_token de Firebase");
  return data.access_token;
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Utilidad para enviar push notification a FCM vía REST API
async function sendPushFCM(token, title, body, data = {}) {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.error('FIREBASE_SERVICE_ACCOUNT no configurado');
    return { error: 'No FCM credentials' };
  }
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  const projectId = serviceAccount.project_id;
  // Obtiene el access token de forma automática
  let ACCESS_TOKEN;
  try {
    ACCESS_TOKEN = await getFirebaseAccessToken(serviceAccount);
  } catch (e) {
    console.error('Error obteniendo access token de Firebase:', e);
    return { error: 'No se pudo obtener access token de Firebase' };
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const payload = {
    message: {
      token,
      notification: {
        title,
        body
      },
      data
    }
  };
  const res = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const resText = await res.text();
  if (!res.ok) {
    console.error('Error FCM:', res.status, resText);
    return { error: resText };
  }
  return { success: true, response: resText };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const { user_id, title, message, type, metadata = {} } = body;
    if (!user_id || !title || !message || !type) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), { status: 400, headers: corsHeaders });
    }
    // 1. Insertar en la tabla notifications
    const insertRes = await fetch(`${PROJECT_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        title,
        message,
        type,
        metadata,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      return new Response(JSON.stringify({ error: 'Error insertando notificación', details: errorText }), { status: 500, headers: corsHeaders });
    }
    // 2. Buscar el fcm_token del usuario
    const profileRes = await fetch(`${PROJECT_URL}/rest/v1/profiles?select=fcm_token&id=eq.${user_id}`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    });
    const profileData = await profileRes.json();
    const fcm_token = profileData[0]?.fcm_token;
    let pushResult = null;
    if (fcm_token) {
      // 3. Enviar push notification
      pushResult = await sendPushFCM(fcm_token, title, message, { type, ...metadata });
    }
    return new Response(JSON.stringify({ success: true, push: pushResult }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error interno', details: e.message }), { status: 500, headers: corsHeaders });
  }
});
