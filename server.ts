import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import admin from 'firebase-admin';

dotenv.config();

// Helper function to initialize Firebase Admin lazily
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  // TENTATIVA 1: Usar variáveis individuais (MUITO mais estável no Render)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    console.log('Inicializando Firebase via variáveis individuais (Método estável)');
    try {
      let privateKey = privateKeyRaw.trim();
      
      // Normalização da Private Key
      const header = '-----BEGIN PRIVATE KEY-----';
      const footer = '-----END PRIVATE KEY-----';
      
      // Remove lixo e normaliza
      let cleanedKey = privateKey;
      if (cleanedKey.includes(header) && cleanedKey.includes(footer)) {
        cleanedKey = cleanedKey.split(header)[1].split(footer)[0];
      }
      
      cleanedKey = cleanedKey.replace(/\\n/g, '').replace(/\n/g, '').replace(/\s/g, '');
      const matches = cleanedKey.match(/.{1,64}/g);
      const formattedKey = matches ? matches.join('\n') : cleanedKey;
      const finalKey = `${header}\n${formattedKey}\n${footer}`;

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: finalKey
        })
      });
      console.log('Firebase Admin inicializado com sucesso (Variáveis individuais)!');
      return;
    } catch (e: any) {
      console.error('Erro ao inicializar com variáveis individuais:', e.message);
      // Se falhar, tenta o método do JSON como fallback
    }
  }

  // TENTATIVA 2: Usar o JSON completo (Método antigo/fallback)
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    throw new Error('Configuração do Firebase não encontrada. Use FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no Render.');
  }

  try {
    let envVar = saJson.trim();
    
    // Suporte a Base64
    if (!envVar.startsWith('{') && !envVar.startsWith("'") && !envVar.startsWith('"')) {
      try {
        const cleanBase64 = envVar.replace(/\s/g, '');
        const decoded = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        const sanitizedDecoded = decoded.replace(/\xA0/g, ' ');
        if (sanitizedDecoded.trim().startsWith('{')) {
          envVar = sanitizedDecoded.trim();
        }
      } catch (e) {}
    }
    
    if ((envVar.startsWith("'") && envVar.endsWith("'")) || (envVar.startsWith('"') && envVar.endsWith('"'))) {
      envVar = envVar.slice(1, -1);
    }
    
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(envVar);
    } catch (parseErr) {
      const flattened = envVar.replace(/\r?\n|\r/g, ' ');
      try {
        serviceAccount = JSON.parse(flattened);
      } catch (e) {
        const start = envVar.indexOf('{');
        const end = envVar.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          serviceAccount = JSON.parse(envVar.substring(start, end + 1));
        } else {
          throw new Error('JSON Inválido');
        }
      }
    }

    const pId = (serviceAccount.project_id || serviceAccount.projectId || '').toString().trim();
    const cEmail = (serviceAccount.client_email || serviceAccount.clientEmail || '').toString().trim();
    let pKey = serviceAccount.private_key || serviceAccount.privateKey;

    if (typeof pKey === 'string') {
      const header = '-----BEGIN PRIVATE KEY-----';
      const footer = '-----END PRIVATE KEY-----';
      let cleaned = pKey.trim();
      if (cleaned.includes(header) && cleaned.includes(footer)) {
        cleaned = cleaned.split(header)[1].split(footer)[0];
      }
      cleaned = cleaned.replace(/\\n/g, '').replace(/\n/g, '').replace(/\s/g, '');
      const matches = cleaned.match(/.{1,64}/g);
      pKey = `${header}\n${matches ? matches.join('\n') : cleaned}\n${footer}`;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: pId,
        clientEmail: cEmail,
        privateKey: pKey
      })
    });
    console.log('Firebase Admin inicializado com sucesso (JSON)!');
  } catch (e: any) {
    console.error('Erro fatal na inicialização do Firebase:', e.message);
    throw new Error(`Erro no Firebase: ${e.message}`);
  }
}

// Helper function to send Firebase push notifications
async function sendFirebasePush(title: string, body: string, token: string) {
  try {
    initializeFirebaseAdmin();

    const message = {
      notification: {
        title: title,
        body: body,
      },
      // Configurações específicas para Web
      webpush: {
        notification: {
          title: title,
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'overdue-contract',
          renotify: true
        },
        fcmOptions: {
          link: '/dashboard'
        }
      },
      // Configurações específicas para Android
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'overdue_contracts',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      // Configurações específicas para iOS
      apns: {
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            sound: 'default',
            badge: 1
          }
        }
      },
      token: token,
    };

    console.log(`Enviando mensagem FCM para o token: ${token.substring(0, 15)}...`);
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error: any) {
    console.error('Error sending Firebase message:', error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  let supabase: any = null;
  if (supabaseUrl && supabaseServiceKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }

  // Initialize Mercado Pago
  const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  let payment: Payment | null = null;
  
  if (mpAccessToken) {
    try {
      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      payment = new Payment(client);
    } catch (e) {
      console.error('Failed to initialize Mercado Pago client:', e);
    }
  }

  // Webhook Handler - Moved to top to ensure it's not intercepted
  app.post(['/api/webhook/mercadopago', '/api/webhook/mercadopago/'], async (req, res) => {
    console.log(`Webhook received: ${req.method} ${req.url}`);
    console.log(`Headers:`, JSON.stringify(req.headers));
    console.log(`Body:`, JSON.stringify(req.body));

    if (!payment || !supabase) {
      console.error('Webhook received but services not configured');
      return res.status(500).send('Services not configured');
    }

    // If it's a GET request (e.g., from a test tool), return 200 to confirm endpoint exists
    if (req.method === 'GET') {
        return res.status(200).send('Webhook endpoint is active');
    }

    const { type, data } = req.body;

    if (type === 'payment') {
      try {
        const paymentId = data.id;
        console.log(`Processing payment ID: ${paymentId}`);
        
        const paymentInfo = await payment.get({ id: paymentId });
        console.log(`Payment info:`, JSON.stringify(paymentInfo));
        console.log(`Payment status: ${paymentInfo.status}`);

        if (paymentInfo.status === 'approved') {
          const userId = paymentInfo.metadata.user_id;
          const planType = paymentInfo.metadata.plan_type || 'monthly'; // Default to monthly if not specified
          console.log(`Payment approved for user: ${userId}, Plan: ${planType}`);

          if (userId) {
            // Calculate expiry date
            const now = new Date();
            let expiryDate = new Date();
            
            if (planType === 'annual') {
              expiryDate.setFullYear(now.getFullYear() + 1);
            } else if (planType === 'semiannual') {
              expiryDate.setMonth(now.getMonth() + 6);
            } else if (planType === 'quarterly') {
              expiryDate.setMonth(now.getMonth() + 3);
            } else {
              // Default fallback (e.g. 1 month)
              expiryDate.setMonth(now.getMonth() + 1);
            }

            // Update user profile to PRO with expiry date
            const { error, data: updatedProfile } = await supabase
              .from('profiles')
              .update({ 
                is_pro: true,
                pro_started_at: now.toISOString(),
                pro_expires_at: expiryDate.toISOString()
              })
              .eq('id', userId)
              .select();

            if (error) {
              console.error('Error updating profile:', error);
              return res.status(500).send(`Error updating profile: ${error.message}`);
            }
            
            if (!updatedProfile || updatedProfile.length === 0) {
                console.error('Profile update succeeded but no rows returned. Check if user ID exists or RLS policies.');
            } else {
                console.log(`User ${userId} upgraded to PRO successfully until ${expiryDate.toISOString()}`);
            }
          } else {
            console.warn('No user_id found in payment metadata');
          }
        }
      } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).send('Webhook error');
      }
    }

    res.status(200).send('OK');
  });

  // API routes FIRST
  app.get("/api/health", async (req, res) => {
    let supabaseStatus = 'unknown';
    let keyValidation = 'unchecked';
    
    if (supabase) {
        try {
            const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            if (error) {
                supabaseStatus = `error: ${error.message}`;
            } else {
                supabaseStatus = 'connected';
            }
        } catch (e: any) {
            supabaseStatus = `exception: ${e.message}`;
        }
    } else {
        supabaseStatus = 'not_initialized';
    }

    if (supabaseServiceKey) {
        keyValidation = supabaseServiceKey.startsWith('eyJ') ? 'valid_format' : 'invalid_format (expected JWT)';
    } else {
        keyValidation = 'missing';
    }

    res.json({ 
        status: "ok", 
        supabase: supabaseStatus,
        key_validation: keyValidation,
        env_check: {
            has_url: !!supabaseUrl,
            has_key: !!supabaseServiceKey
        }
    });
  });

  // Helper function to check if a contract is overdue (matches UI logic)
function isContractOverdue(c: any) {
  if (c.status === 'paid') return false;
  
  const monthlyValue = Number(c.monthly_interest) || 0;
  if (monthlyValue <= 0) return false;

  const totalPaid = Number(c.paid_amount || 0);
  const installmentsFullyPaid = Math.floor(totalPaid / monthlyValue);
  
  if (installmentsFullyPaid >= c.months) return false;

  // Calculate due date of the next unpaid installment
  const firstDueDate = new Date(c.end_date + 'T12:00:00');
  if (c.months > 1) {
    firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
  }
  
  const nextInstallmentDueDate = new Date(firstDueDate);
  nextInstallmentDueDate.setMonth(nextInstallmentDueDate.getMonth() + installmentsFullyPaid);
  
  const now = new Date();
  now.setHours(12, 0, 0, 0); 

  return now.getTime() >= nextInstallmentDueDate.getTime();
}

// Helper function to get client name for a contract
async function getClientName(supabase: any, clientId: string) {
  try {
    const { data } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .single();
    return data?.full_name || 'um cliente';
  } catch (e) {
    return 'um cliente';
  }
}

// Helper function to get user push token
async function getUserPushToken(supabase: any, userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();
    return data?.push_token;
  } catch (e) {
    return null;
  }
}

// --- CRON JOB: Check for overdue contracts and send push notifications ---
const checkAndSendOverdueNotifications = async () => {
  console.log('Running check for overdue contracts...');
  if (!supabase) {
    console.log('Supabase not configured. Skipping check.');
    return { success: false, message: 'Supabase not configured' };
  }

  try {
    // Fetch all active or overdue contracts
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('*')
      .or('status.eq.active,status.eq.overdue');

    if (error) {
      console.error('Error fetching contracts for cron:', error);
      return { success: false, message: 'Error fetching contracts' };
    }

    let sentCount = 0;
    const overdueList = contracts?.filter(isContractOverdue) || [];

    if (overdueList.length > 0) {
      console.log(`Found ${overdueList.length} overdue contracts in cron.`);

      for (const contract of overdueList) {
        // Update status to overdue if it was active
        if (contract.status === 'active') {
          await supabase
            .from('contracts')
            .update({ status: 'overdue' })
            .eq('id', contract.id);
        }

        const clientName = await getClientName(supabase, contract.client_id);
        const pushToken = await getUserPushToken(supabase, contract.user_id);

        if (pushToken) {
          try {
            await sendFirebasePush(
              'Contrato Vencido! ⚠️',
              `O contrato do cliente ${clientName} está vencido!`,
              pushToken
            );
            sentCount++;
          } catch (pushError) {
            console.error(`Failed to send push in cron:`, pushError);
          }
        }
      }
      return { success: true, message: `Processados ${overdueList.length} contratos. Enviadas ${sentCount} notificações.` };
    }

    return { success: true, message: 'Nenhum contrato vencido encontrado.' };
  } catch (err) {
    console.error('Error in cron process:', err);
    return { success: false, message: 'Internal error during check' };
  }
};

  // Schedule the cron job for 8:00 AM and 8:00 PM (20:00)
  cron.schedule('0 8,20 * * *', checkAndSendOverdueNotifications);

  // Manual trigger endpoint for testing
  app.post('/api/trigger-overdue-check', async (req, res) => {
    const result = await checkAndSendOverdueNotifications();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });
  // -------------------------------------------------------------------------

  // Create Payment (PIX)
  app.post('/api/create-payment', async (req, res) => {
    if (!payment) {
      return res.status(500).json({ error: 'Mercado Pago not configured (missing access token)' });
    }
    
    try {
      const { userId, email, name, taxId, amount } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: 'Missing userId or email' });
      }

      const notificationUrl = `${process.env.APP_URL || 'https://your-app-url.com'}/api/webhook/mercadopago`;
      console.log('Creating payment with notification_url:', notificationUrl);

      let planType = 'monthly';
      let description = 'Upgrade Agicred PRO - Mensal';

      if (amount === 109.90) {
        planType = 'annual';
        description = 'Upgrade Agicred PRO - Anual';
      } else if (amount === 69.90) {
        planType = 'semiannual';
        description = 'Upgrade Agicred PRO - Semestral';
      } else if (amount === 39.90) {
        planType = 'quarterly';
        description = 'Upgrade Agicred PRO - Trimestral';
      }

      const firstName = name ? name.split(' ')[0] : 'Cliente';
      const lastName = name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Agicred';
      const cleanTaxId = taxId ? taxId.replace(/\D/g, '') : '00000000000';

      const body = {
        transaction_amount: Number(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: cleanTaxId.length === 14 ? 'CNPJ' : 'CPF',
            number: cleanTaxId
          }
        },
        notification_url: notificationUrl,
        metadata: {
          user_id: userId,
          plan_type: planType
        }
      };

      const response = await payment.create({ body });
      console.log("Mercado Pago Response:", JSON.stringify(response, null, 2));

      if (response.status === 'rejected') {
        return res.status(400).json({ error: 'Pagamento rejeitado pelo Mercado Pago. Verifique se o CPF e os dados estão corretos.' });
      }

      if (!response.point_of_interaction?.transaction_data?.qr_code_base64) {
        return res.status(400).json({ error: 'Mercado Pago não retornou o QR Code. Verifique os dados e tente novamente.' });
      }

      res.json({
        id: response.id,
        status: response.status,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: response.point_of_interaction?.transaction_data?.ticket_url
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      const errorMessage = error.message || (error.response ? JSON.stringify(error.response) : JSON.stringify(error));
      res.status(500).json({ error: errorMessage });
    }
  });

  // -------------------------------------------------------------------------

  // Check Payment Status (Polling) & Manual Verification
  app.get('/api/payment-status/:id', async (req, res) => {
    if (!payment) {
      return res.status(500).json({ error: 'Mercado Pago not configured' });
    }

    try {
      const paymentId = req.params.id;
      const paymentInfo = await payment.get({ id: paymentId });
      
      // If approved, ensure user is updated (Manual Fallback)
      if (paymentInfo.status === 'approved') {
          const userId = paymentInfo.metadata.user_id;
          const planType = paymentInfo.metadata.plan_type || 'monthly';
          
          if (userId && supabase) {
             // Check if user is already PRO to avoid redundant updates if webhook worked
             const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();
             
             if (!profile?.is_pro) {
                 console.log(`Manual check: Upgrading user ${userId} for payment ${paymentId}`);
                 const now = new Date();
                 let expiryDate = new Date();
                 
                 if (planType === 'annual') expiryDate.setFullYear(now.getFullYear() + 1);
                 else if (planType === 'semiannual') expiryDate.setMonth(now.getMonth() + 6);
                 else if (planType === 'quarterly') expiryDate.setMonth(now.getMonth() + 3);
                 else expiryDate.setMonth(now.getMonth() + 1);

                 await supabase.from('profiles').update({ 
                    is_pro: true,
                    pro_expires_at: expiryDate.toISOString()
                 }).eq('id', userId);
             }
          }
      }
      
      res.json({
        status: paymentInfo.status,
        is_approved: paymentInfo.status === 'approved'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test Push Notification
  app.post('/api/test-push', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const pushToken = await getUserPushToken(supabase, userId);
      if (!pushToken) {
        return res.status(404).json({ error: 'Usuário não possui token de notificação registrado.' });
      }

      // Fetch all active or overdue contracts for this user
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .or('status.eq.active,status.eq.overdue');

      if (error) {
        console.error('Error fetching contracts for test:', error);
        return res.status(500).json({ error: 'Erro ao buscar contratos vencidos' });
      }

      const overdueList = contracts?.filter(isContractOverdue) || [];
      console.log(`Test Push: Found ${overdueList.length} overdue contracts for user ${userId}`);

      if (overdueList.length > 0) {
        let sentCount = 0;
        const errors: string[] = [];
        
        for (const contract of overdueList) {
          // Update status to overdue if it was active
          if (contract.status === 'active') {
            await supabase
              .from('contracts')
              .update({ status: 'overdue' })
              .eq('id', contract.id);
          }

          const clientName = await getClientName(supabase, contract.client_id);

          try {
            console.log(`Enviando push para token: ${pushToken.substring(0, 10)}...`);
            await sendFirebasePush(
              'Contrato Vencido! ⚠️',
              `O contrato do cliente ${clientName} está vencido!`,
              pushToken
            );
            sentCount++;
          } catch (pushError: any) {
            console.error(`Failed to send push in test for contract ${contract.id}:`, pushError);
            errors.push(`${contract.id}: ${pushError.message}`);
          }
        }
        
        const message = `Foram encontrados ${overdueList.length} contratos vencidos e ${sentCount} notificações foram enviadas.${errors.length > 0 ? ' Erros: ' + errors.join(', ') : ''}`;
        res.json({ success: true, message, sentCount, totalOverdue: overdueList.length });
      } else {
        // Send a simulated notification if no overdue contracts are found so they can still test it
        try {
          await sendFirebasePush(
            'Contrato Vencido! ⚠️ (Simulação)',
            'Nenhum contrato vencido foi encontrado agora, mas é assim que a notificação aparecerá!',
            pushToken
          );
          res.json({ success: true, message: 'Nenhum contrato vencido encontrado. Uma notificação de simulação foi enviada para teste.', simulated: true });
        } catch (pushError: any) {
          throw pushError;
        }
      }
    } catch (error: any) {
      console.error('Error sending test push:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // DEBUG: Test Supabase Connection and Upgrade
  app.post('/api/debug/test-upgrade', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });

    try {
      // 1. Check if user exists
      const { data: user, error: userError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (userError) {
        return res.status(404).json({ error: `User not found or error: ${userError.message}` });
      }

      // 2. Attempt upgrade
      const expiryDate = new Date(Date.now() + 30*24*60*60*1000); // 30 days
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ 
            is_pro: true, 
            pro_expires_at: expiryDate.toISOString() 
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        return res.status(500).json({ error: `Update failed: ${updateError.message}` });
      }

      return res.json({ 
        success: true, 
        message: 'Upgrade successful via debug endpoint',
        original_user: user,
        updated_user: updated
      });
    } catch (e: any) {
      return res.status(500).json({ error: `Exception: ${e.message}` });
    }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to start Vite server:', e);
    }
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
    
    // SPA fallback
    app.get(/.*/, (req, res) => {
      res.sendFile(process.cwd() + '/dist/index.html');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
