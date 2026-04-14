import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());

// Workaround for Vercel's pre-parsed body
app.use((req: any, res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req._body = true;
  }
  next();
});

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

// Webhook Handler
app.post(['/api/webhook/mercadopago', '/api/webhook/mercadopago/'], async (req, res) => {
  console.log(`Webhook received: ${req.method} ${req.url}`);
  
  if (!payment || !supabase) {
    console.error('Webhook received but services not configured');
    return res.status(500).send('Services not configured');
  }

  if (req.method === 'GET') {
      return res.status(200).send('Webhook endpoint is active');
  }

  const { type, data } = req.body;

  if (type === 'payment') {
    try {
      const paymentId = String(data.id);
      console.log(`Processing payment ID: ${paymentId}`);
      
      if ((global as any).processedPayments?.has(paymentId)) {
        console.log(`Payment ${paymentId} already processed. Skipping.`);
        return res.status(200).send('Payment already processed');
      }
      if (!(global as any).processedPayments) (global as any).processedPayments = new Set<string>();
      (global as any).processedPayments.add(paymentId);

      const paymentInfo = await payment.get({ id: paymentId });
      
      if (paymentInfo.status === 'approved') {
        const userId = paymentInfo.metadata.user_id;
        const planType = paymentInfo.metadata.plan_type || 'monthly';
        console.log(`Payment approved for user: ${userId}, Plan: ${planType}`);

        if (userId) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('pro_expires_at, pro_started_at')
            .eq('id', userId)
            .single();

          const now = new Date();
          let baseDate = now;
          
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

          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

          if (error) {
            (global as any).processedPayments.delete(paymentId);
            console.error('Error updating profile:', error);
            return res.status(500).send(`Error updating profile: ${error.message}`);
          }
          
          console.log(`Successfully upgraded user ${userId} to PRO until ${expiryDate.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).send('Webhook error');
    }
  }

  res.status(200).send('OK');
});

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

function isContractOverdue(c: any) {
  if (c.status === 'paid') return false;
  
  const monthlyValue = Number(c.monthly_interest) || 0;
  if (monthlyValue <= 0) return false;

  const totalPaid = Number(c.paid_amount || 0);
  const installmentsFullyPaid = Math.floor(Math.round(totalPaid * 100) / Math.round(monthlyValue * 100));
  
  if (installmentsFullyPaid >= c.months) return false;

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

export const checkAndSendOverdueNotifications = async () => {
  console.log('Running check for overdue contracts...');
  if (!supabase) {
    console.log('Supabase not configured. Skipping check.');
    return { success: false, message: 'Supabase not configured' };
  }

  try {
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

export const checkExpiredTrials = async () => {
  console.log('Running check for expired trials...');
  if (!supabase) return { success: false, message: 'Supabase not configured' };

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
      return { success: false, message: 'Error checking expired trials' };
    } else if (data && data.length > 0) {
      console.log(`Expired ${data.length} trials.`);
      return { success: true, message: `Expired ${data.length} trials.` };
    }
    return { success: true, message: 'No expired trials found.' };
  } catch (err) {
    console.error('Exception in trial check:', err);
    return { success: false, message: 'Exception in trial check' };
  }
};

// Vercel Cron endpoints (can also be triggered manually)
app.get('/api/trigger-overdue-check', async (req, res) => {
  // Vercel Cron sends a special header, but we can also allow manual triggers
  if (process.env.VERCEL && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron trigger attempt');
    // We can choose to return 401, but for now we'll allow it or just log it.
  }
  const result = await checkAndSendOverdueNotifications();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/api/trigger-trial-check', async (req, res) => {
  const result = await checkExpiredTrials();
  res.json(result);
});

// Keep POST for backward compatibility
app.post('/api/trigger-overdue-check', async (req, res) => {
  const result = await checkAndSendOverdueNotifications();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.post('/api/trigger-trial-check', async (req, res) => {
  const result = await checkExpiredTrials();
  res.json(result);
});

app.post('/api/delete-account', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });

    console.log(`Deleting account for user: ${userId}`);

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return res.status(500).json({ error: `Auth deletion failed: ${authError.message}` });
    }

    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileError) {
      console.error('Error deleting user profile:', profileError);
    }

    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (e: any) {
    console.error('Exception in delete account:', e);
    return res.status(500).json({ error: `Exception: ${e.message}` });
  }
});

app.post(['/api/create-payment', '/api/create-payment/'], async (req, res) => {
  if (!payment) {
    return res.status(500).json({ error: 'Mercado Pago not configured (missing access token)' });
  }
  
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
    }
    const { userId, email, name, taxId, amount } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    const notificationUrl = `${process.env.APP_URL || 'https://your-app-url.com'}/api/webhook/mercadopago`;
    console.log('Creating payment with notification_url:', notificationUrl);

    let planType = 'monthly';
    let description = 'Upgrade Agicred PRO - Mensal';

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

    const idempotencyKey = `pay_${userId}_${Date.now()}`;

    console.log(`Creating payment for user ${userId} (${email}), amount: ${amount}, plan: ${planType}`);
    
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
      console.error('Mercado Pago SDK Error:', sdkError);
      
      const mpDetails = sdkError.cause || sdkError;
      let customErrorMessage = sdkError.message || 'Erro ao processar pagamento no Mercado Pago';

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

app.get('/api/payment-status/:id', async (req, res) => {
  if (!payment) {
    return res.status(500).json({ error: 'Mercado Pago not configured' });
  }

  try {
    const paymentId = req.params.id;
    const paymentInfo = await payment.get({ id: paymentId });
    
    res.json({
      status: paymentInfo.status,
      is_approved: paymentInfo.status === 'approved'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debug/test-upgrade', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });

  try {
    const { data: user, error: userError } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (userError) {
      return res.status(404).json({ error: `User not found or error: ${userError.message}` });
    }

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

export default app;
