import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event) => {
  // Headers para permitir que o aplicativo do celular acesse o Netlify
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Firebase config missing in Netlify Environment Variables' }) 
      };
    }

    // Inicializa o Firebase apenas se ainda não estiver inicializado
    if (getApps().length === 0) {
      let envVar = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
      if (envVar.startsWith("'") && envVar.endsWith("'")) {
        envVar = envVar.slice(1, -1);
      }
      const serviceAccount = JSON.parse(envVar);
      initializeApp({ credential: cert(serviceAccount) });
    }

    const body = JSON.parse(event.body || '{}');
    const userId = body.userId;
    
    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (!profile || !profile.push_token) {
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'User has no push token registered' }) 
      };
    }

    const message = {
      notification: {
        title: 'Teste Netlify 🚀',
        body: 'Seu sistema de notificações push está funcionando pelo Netlify!',
      },
      android: {
        notification: {
          channelId: 'cobranca_alerts',
          priority: 'high' as const,
        }
      },
      token: profile.push_token,
    };

    await getMessaging().send(message);
    
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true, message: 'Push notification sent via Netlify' }) 
    };
  } catch (error: any) {
    console.error('Error sending push via Netlify:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
