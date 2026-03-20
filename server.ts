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
      console.log('Mercado Pago Access Token found (length:', mpAccessToken.length, ')');
      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      payment = new Payment(client);
    } catch (e) {
      console.error('Failed to initialize Mercado Pago client:', e);
    }
  } else {
    console.warn('MERCADO_PAGO_ACCESS_TOKEN is missing in environment variables');
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
              .select('pro_expires_at, pro_started_at')
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

            const updateData: any = { 
              is_pro: true,
              is_trial: false,
              pro_expires_at: expiryDate.toISOString()
            };

            if (!currentProfile?.pro_started_at) {
              updateData.pro_started_at = now.toISOString();
            }

            // Update user profile to PRO with expiry date
            const { error, data: updatedProfile } = await supabase
              .from('profiles')
              .update(updateData)
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

  app.post("/api/check-registration", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }

      const { email, cpf } = req.body;

      if (!email && !cpf) {
        return res.status(400).json({ error: 'Email or CPF is required' });
      }

      // Check if CPF exists
      if (cpf) {
        const { data: cpfData, error: cpfError } = await supabase
          .from('profiles')
          .select('id')
          .eq('cpf', cpf)
          .limit(1);

        if (cpfError) {
          console.error('Error checking CPF:', cpfError);
          return res.status(500).json({ error: 'Database error' });
        }

        if (cpfData && cpfData.length > 0) {
          return res.json({ exists: true, reason: 'cpf' });
        }
      }

      // Check if email exists
      if (email) {
        const { data: emailData, error: emailError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .limit(1);

        if (emailError) {
          console.error('Error checking email:', emailError);
          return res.status(500).json({ error: 'Database error' });
        }

        if (emailData && emailData.length > 0) {
          return res.json({ exists: true, reason: 'email' });
        }
      }

      return res.json({ exists: false });
    } catch (error) {
      console.error('Check registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
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

  // --- CRON JOB: Check for expired trials ---
  const checkExpiredTrials = async () => {
    console.log('Running check for expired trials...');
    if (!supabase) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_trial: false })
        .eq('is_trial', true)
        .lt('trial_expires_at', now)
        .select();

      if (error) {
        console.error('Error checking expired trials:', error);
      } else if (data && data.length > 0) {
        console.log(`Expired ${data.length} trials.`);
      }
    } catch (err) {
      console.error('Exception in trial check:', err);
    }
  };

  // Run trial check every hour
  cron.schedule('0 * * * *', checkExpiredTrials);

  // Manual trigger endpoint for testing
  app.post('/api/trigger-overdue-check', async (req, res) => {
    const result = await checkAndSendOverdueNotifications();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });

  app.post('/api/trigger-trial-check', async (req, res) => {
    await checkExpiredTrials();
    res.json({ success: true, message: 'Trial check triggered' });
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
      const cleanTaxId = taxId ? taxId.replace(/\D/g, '') : '';

      if (!cleanTaxId || (cleanTaxId.length !== 11 && cleanTaxId.length !== 14)) {
        return res.status(400).json({ error: 'CPF ou CNPJ inválido. Certifique-se de digitar todos os números corretamente.' });
      }

      const body = {
        transaction_amount: Number(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: email.trim().toLowerCase(),
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

      // Use the SDK instead of direct fetch for better compatibility and error handling
      if (!payment) {
        return res.status(500).json({ error: 'Mercado Pago não inicializado corretamente.' });
      }

      console.log(`Creating payment for user ${userId} (${email}), amount: ${amount}, plan: ${planType}`);
      console.time(`mp_create_payment_${userId}`);
      
      try {
        const result = await payment.create({
          body: {
            transaction_amount: Number(amount),
            description: description,
            payment_method_id: 'pix',
            installments: 1,
            external_reference: `pay_${userId}_${Date.now()}`,
            payer: {
              email: email.trim().toLowerCase(),
              first_name: firstName,
              last_name: lastName,
              identification: {
                type: cleanTaxId.length === 14 ? 'CNPJ' : 'CPF',
                number: cleanTaxId
              }
            },
            notification_url: (process.env.APP_URL && !process.env.APP_URL.includes('your-app-url')) 
              ? `${process.env.APP_URL}/api/webhook/mercadopago` 
              : undefined,
            metadata: {
              user_id: userId,
              plan_type: planType
            }
          },
          requestOptions: { idempotencyKey }
        });

        console.timeEnd(`mp_create_payment_${userId}`);
        console.log(`Payment created for user ${userId}, status: ${result.status}, detail: ${result.status_detail}, id: ${result.id}`);

        if (result.status === 'rejected') {
          const detail = result.status_detail || '';
          let errorMsg = 'Pagamento rejeitado pelo Mercado Pago.';
          if (detail === 'cc_rejected_bad_filled_other') errorMsg += ' Verifique se o CPF e os dados estão corretos.';
          if (detail === 'cc_rejected_invalid_installments') errorMsg += ' Número de parcelas inválido.';
          
          return res.status(400).json({ 
            error: `${errorMsg} (Detalhe: ${detail})`, 
            details: result 
          });
        }

        const qrCode = result.point_of_interaction?.transaction_data?.qr_code;
        const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;

        if (!qrCode || !qrCodeBase64) {
          console.error('Mercado Pago Response missing QR Code data:', JSON.stringify(result));
          const statusDetail = result.status_detail || 'Sem detalhes adicionais';
          return res.status(400).json({ 
            error: `Mercado Pago não retornou o QR Code. Status: ${result.status}, Detalhe: ${statusDetail}. Verifique se o PIX está ativo na sua conta do Mercado Pago.`, 
            details: result 
          });
        }

        res.json({
          id: result.id,
          status: result.status,
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });
      } catch (sdkError: any) {
        console.timeEnd(`mp_create_payment_${userId}`);
        console.error('Mercado Pago SDK Error:', sdkError);
        
        const mpDetails = sdkError.cause || sdkError;
        let customErrorMessage = sdkError.message || 'Erro ao processar pagamento no Mercado Pago';

        // Translate specific Mercado Pago errors to user-friendly Portuguese messages
        if (Array.isArray(mpDetails)) {
          const hasInvalidCpf = mpDetails.some((err: any) => 
            err.code === 2067 || 
            err.code === 324 || 
            (err.description && err.description.includes('identification number'))
          );
          
          if (hasInvalidCpf) {
            customErrorMessage = 'O CPF ou CNPJ informado é inválido. O Mercado Pago exige um documento real (matematicamente válido) para gerar o PIX.';
          }
        } else if (sdkError.message && sdkError.message.includes('identification number')) {
          customErrorMessage = 'O CPF ou CNPJ informado é inválido. O Mercado Pago exige um documento real (matematicamente válido) para gerar o PIX.';
        }
        
        res.status(400).json({ 
          error: customErrorMessage,
          details: mpDetails
        });
      }
    } catch (error: any) {
      console.error('General error in create-payment route:', error);
      res.status(500).json({ error: error.message || 'Erro interno ao processar pagamento' });
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
             const { data: profile } = await supabase.from('profiles').select('is_pro, pro_expires_at, pro_started_at').eq('id', userId).single();
             
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

             const updateData: any = { 
                is_pro: true,
                is_trial: false,
                pro_expires_at: expiryDate.toISOString()
             };

             if (!profile?.pro_started_at) {
                updateData.pro_started_at = now.toISOString();
             }

             await supabase.from('profiles').update(updateData).eq('id', userId);
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
