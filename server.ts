import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import admin from 'firebase-admin';

dotenv.config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT not found in environment variables');
}

// Helper function to send Firebase push notifications
async function sendFirebasePush(title: string, body: string, token: string) {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
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

  // --- CRON JOB: Check for overdue contracts and send push notifications ---
  // Runs every day at 08:00 AM and 08:00 PM (20:00)
  const checkAndSendOverdueNotifications = async () => {
    console.log('Running check for overdue contracts...');
    if (!supabase) {
      console.log('Supabase not configured. Skipping check.');
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      // Find contracts that are active and past their end_date
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueContracts, error } = await supabase
        .from('contracts')
        .select('id, user_id, client_id, end_date')
        .eq('status', 'active')
        .lt('end_date', today);

      if (error) {
        console.error('Error fetching overdue contracts:', error);
        return { success: false, message: 'Error fetching overdue contracts' };
      }

      let sentCount = 0;

      if (overdueContracts && overdueContracts.length > 0) {
        console.log(`Found ${overdueContracts.length} overdue contracts.`);

        for (const contract of overdueContracts) {
          // Update status to overdue
          await supabase
            .from('contracts')
            .update({ status: 'overdue' })
            .eq('id', contract.id);

          // Get the client's name
          const { data: clientData } = await supabase
            .from('clients')
            .select('full_name')
            .eq('id', contract.client_id)
            .single();

          const clientName = clientData?.full_name || 'um cliente';

          // Get the user's push token
          const { data: profile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', contract.user_id)
            .single();

          if (profile && profile.push_token) {
            try {
              await sendFirebasePush(
                'Contrato Vencido! ⚠️',
                `O contrato do cliente ${clientName} está vencido!`,
                profile.push_token
              );
              console.log(`Push notification sent to user ${contract.user_id} for contract ${contract.id}`);
              sentCount++;
            } catch (pushError: any) {
              console.error(`Failed to send push notification to ${profile.push_token}:`, pushError);
            }
          }
        }
        return { success: true, message: `Found ${overdueContracts.length} overdue contracts. Sent ${sentCount} notifications.` };
      } else {
        console.log('No overdue contracts found.');
        return { success: true, message: 'No overdue contracts found.' };
      }
    } catch (err) {
      console.error('Error in check process:', err);
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
      const { userId, email, amount } = req.body;

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

      const body = {
        transaction_amount: Number(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: email,
        },
        notification_url: notificationUrl,
        metadata: {
          user_id: userId,
          plan_type: planType
        }
      };

      const response = await payment.create({ body });

      res.json({
        id: response.id,
        status: response.status,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: response.point_of_interaction?.transaction_data?.ticket_url
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: error.message });
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (!profile || !profile.push_token) {
        return res.status(404).json({ error: 'Usuário não possui token de notificação registrado.' });
      }

      try {
        await sendFirebasePush(
          'Teste de Notificação! 🚀',
          'Seu sistema de notificações Firebase está funcionando perfeitamente!',
          profile.push_token
        );
        res.json({ success: true, message: 'Notificação enviada com sucesso' });
      } catch (pushError: any) {
        throw pushError;
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
