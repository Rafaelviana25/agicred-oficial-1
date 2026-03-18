import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

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
            // Fetch current profile to check existing expiry
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('pro_expires_at')
              .eq('id', userId)
              .single();

            // Calculate expiry date
            const now = new Date();
            let baseDate = now;
            
            // If user already has a PRO plan that hasn't expired, add to it
            if (currentProfile?.pro_expires_at) {
              const currentExpiry = new Date(currentProfile.pro_expires_at);
              if (currentExpiry > now) {
                baseDate = currentExpiry;
              }
            }

            let expiryDate = new Date(baseDate);
            
            if (planType === 'annual') {
              expiryDate.setFullYear(baseDate.getFullYear() + 1);
            } else if (planType === 'semiannual') {
              expiryDate.setMonth(baseDate.getMonth() + 6);
            } else if (planType === 'quarterly') {
              expiryDate.setMonth(baseDate.getMonth() + 3);
            } else {
              // Default fallback (e.g. 1 month)
              expiryDate.setMonth(baseDate.getMonth() + 1);
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
  const installmentsFullyPaid = Math.floor(Math.round(totalPaid * 100) / Math.round(monthlyValue * 100));
  
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

// --- CRON JOB: Check for overdue contracts and update status ---
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

    let updatedCount = 0;
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
          updatedCount++;
        }
      }
      return { success: true, message: `Processados ${overdueList.length} contratos. Atualizados ${updatedCount} para status overdue.` };
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

      // Match the amounts from UpgradeModal.tsx
      if (amount === 156.00) {
        planType = 'annual';
        description = 'Upgrade Agicred PRO - Anual';
      } else if (amount === 108.00) {
        planType = 'semiannual';
        description = 'Upgrade Agicred PRO - Semestral';
      } else if (amount === 66.00) {
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

      // Use a unique idempotency key to potentially speed up processing and prevent duplicates
      const idempotencyKey = `pay_${userId}_${Date.now()}`;

      console.time(`mp_create_payment_${userId}`);
      
      // Use AbortController for timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for MP call

      // Use direct fetch for faster execution and less overhead than the SDK
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.timeEnd(`mp_create_payment_${userId}`);
      
      const response = await mpResponse.json();
      
      console.log(`Payment created for user ${userId}, status: ${response.status}`);

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
             const { data: profile } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', userId).single();
             
             // We check if the payment was already processed by comparing metadata or just checking if it's already updated
             // For simplicity, we'll check if we need to update. 
             // Note: In a real app, we'd track payment IDs in a table to prevent double-processing.
             
             console.log(`Manual check: Upgrading user ${userId} for payment ${paymentId}`);
             const now = new Date();
             let baseDate = now;

             if (profile?.pro_expires_at) {
                const currentExpiry = new Date(profile.pro_expires_at);
                if (currentExpiry > now) {
                   baseDate = currentExpiry;
                }
             }

             let expiryDate = new Date(baseDate);
             
             if (planType === 'annual') expiryDate.setFullYear(baseDate.getFullYear() + 1);
             else if (planType === 'semiannual') expiryDate.setMonth(baseDate.getMonth() + 6);
             else if (planType === 'quarterly') expiryDate.setMonth(baseDate.getMonth() + 3);
             else expiryDate.setMonth(baseDate.getMonth() + 1);

             await supabase.from('profiles').update({ 
                is_pro: true,
                pro_expires_at: expiryDate.toISOString()
             }).eq('id', userId);
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
