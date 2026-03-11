
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { CheckCircle2, ShieldCheck, QrCode, RefreshCw, Copy, Check, Mail, ArrowLeft } from 'lucide-react';

interface UpgradeModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, onClose, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<{ amount: number, label: string } | null>(null);
  const [step, setStep] = useState<'plans' | 'form' | 'qr'>('plans');
  const [form, setForm] = useState({
    name: user.full_name,
    cellphone: user.phone,
    email: user.email,
    taxId: user.cpf
  });
  const [paymentData, setPaymentData] = useState<{ id: string, qr_code: string, qr_code_base64: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(1800);

  const plans = [
    { id: 'mensal', label: 'MENSAL', amount: 19.90, period: '/MÊS', description: 'ACESSO RÁPIDO E FLEXÍVEL.' },
    { id: 'quarterly', label: 'TRIMESTRAL', amount: 39.90, period: '/TRIMESTRE', description: 'PARA QUEM ESTÁ COMEÇANDO.' },
    { id: 'semiannual', label: 'SEMESTRAL', amount: 69.90, period: '/SEMESTRE', description: 'EQUILÍBRIO E ECONOMIA.' },
    { id: 'annual', label: 'ANUAL', amount: 109.90, period: '/ANO', description: 'O MELHOR VALOR TOTAL!', bestValue: true },
  ];

  useEffect(() => {
    // Check for pending payment in localStorage
    const savedPayment = localStorage.getItem('pending_payment');
    if (savedPayment) {
      try {
        const parsed = JSON.parse(savedPayment);
        // Check if it's recent (less than 24h)
        const paymentDate = new Date(parsed.created_at || Date.now());
        const now = new Date();
        const diffHours = Math.abs(now.getTime() - paymentDate.getTime()) / 36e5;
        
        if (diffHours < 24 && parsed.userId === user.id) {
           setPaymentData(parsed);
           setStep('qr');
           // Auto-check status if we have a saved payment
           checkStatus();
        } else {
           localStorage.removeItem('pending_payment');
        }
      } catch (e) {
        localStorage.removeItem('pending_payment');
      }
    }
  }, []);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setStep('form');
  };

  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          email: form.email,
          amount: selectedPlan.amount
        })
      });

      const data = await response.json();

      if (data.id) {
        const paymentWithMeta = { ...data, userId: user.id, created_at: new Date().toISOString() };
        setPaymentData(paymentWithMeta);
        localStorage.setItem('pending_payment', JSON.stringify(paymentWithMeta));
        setStep('qr');
      } else {
        console.error('Erro ao criar pagamento:', data);
        alert(`Erro ao gerar PIX: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro de conexão ao gerar PIX: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!paymentData) return false;
    try {
      const response = await fetch(`/api/payment-status/${paymentData.id}`);
      const data = await response.json();
      
      if (data.is_approved) {
        setIsPaid(true);
        localStorage.removeItem('pending_payment'); // Clear pending payment
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3500);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      return false;
    }
  };

  const handleManualCheck = async () => {
    if (!paymentData || checking) return;
    setChecking(true);
    const isApproved = await checkStatus();
    if (!isApproved) {
      setPaymentErrorMsg("PAGAMENTO AINDA NÃO EFETUADO");
      setTimeout(() => setPaymentErrorMsg(null), 3000);
    }
    setChecking(false);
  };

  const copyToClipboard = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      alert('Código PIX copiado!');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: any;
    if (step === 'qr' && !isPaid && paymentData) {
      interval = setInterval(checkStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [step, isPaid, paymentData]);

  useEffect(() => {
    let timer: any;
    if (step === 'qr' && !isPaid && expiresIn > 0) {
      timer = setInterval(() => {
        setExpiresIn((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, isPaid, expiresIn]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 pt-10 z-50 uppercase overflow-y-auto">
      <div className="glass-panel rounded-b-[3rem] lg:rounded-3xl max-w-2xl w-full p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-10 duration-300 border border-slate-200 bg-white mb-10">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition z-20">✕</button>
        
        {isPaid ? (
          <div className="text-center py-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/10 ring-8 ring-emerald-500/10">
              <CheckCircle2 size={48} className="animate-bounce" />
            </div>
            <div>
               <h2 className="text-3xl font-black text-slate-900">PAGAMENTO CONFIRMADO!</h2>
               <p className="text-emerald-600 font-bold text-lg mt-2">VERSÃO PRO ATIVA 💎</p>
            </div>
            <p className="text-slate-500 text-sm">AGUARDE... REDIRECIONANDO VOCÊ PARA O DASHBOARD ILIMITADO.</p>
          </div>
        ) : step === 'plans' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">ESCOLHA SEU PLANO PRO</h2>
              <p className="text-slate-500 font-bold mt-1 text-[9px] md:text-[10px] tracking-widest uppercase">DESBLOQUEIE TODOS OS RECURSOS AGORA MESMO.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className="relative p-4 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-white hover:shadow-xl hover:scale-[1.02] group"
                >
                  {plan.bestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
                      MELHOR ESCOLHA
                    </span>
                  )}

                  <div className="mb-3 text-center">
                    <h3 className="text-xs font-black text-slate-900 tracking-widest">{plan.label}</h3>
                    <p className="mt-1 text-[9px] text-slate-500 font-bold">{plan.description}</p>
                  </div>

                  <div className="mb-3 text-center">
                    <div className="flex items-baseline justify-center">
                      <span className="text-xl font-black text-slate-900">R$ {plan.amount.toFixed(2).replace('.', ',')}</span>
                      <span className="ml-1 text-[9px] text-slate-500 font-bold">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-grow">
                    <li className="flex items-center text-[9px] font-bold text-slate-600">
                      <Check className="w-3 h-3 text-emerald-500 mr-1.5 flex-shrink-0" /> ACESSO ILIMITADO
                    </li>
                    <li className="flex items-center text-[9px] font-bold text-slate-600">
                      <Check className="w-3 h-3 text-emerald-500 mr-1.5 flex-shrink-0" /> SUPORTE 24/7
                    </li>
                  </ul>

                  <button 
                    className="w-full py-2.5 px-4 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all bg-slate-200 text-slate-600 group-hover:bg-violet-600 group-hover:text-white"
                  >
                    ASSINAR {plan.label}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 opacity-60 grayscale">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">PROCESSADO POR</span>
                 <span className="font-black text-xs text-blue-900 tracking-tighter">MERCADO PAGO</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                AMBIENTE SEGURO E CRIPTOGRAFADO
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                <Mail className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  SUPORTE: <span className="lowercase font-bold text-slate-400">agicred.gestaodecredito@gmail.com</span>
                </span>
              </div>
            </div>

            <button onClick={onClose} className="w-full text-slate-400 text-[9px] font-black tracking-widest hover:text-slate-600 transition-colors mt-2">
              CONTINUAR COM CONTA GRÁTIS (LIMITADA)
            </button>
          </div>
        ) : step === 'form' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('plans')} className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 rounded-xl hover:bg-slate-200">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">DADOS DE PAGAMENTO</h2>
              <div className="w-9"></div>
            </div>

            <form onSubmit={handleCreateQR} className="space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 text-center mb-6">
                <p className="text-[10px] font-bold text-violet-600 tracking-widest">PLANO SELECIONADO</p>
                <p className="text-lg font-black text-violet-900 mt-1">{selectedPlan?.label} - R$ {selectedPlan?.amount.toFixed(2).replace('.', ',')}</p>
              </div>
              
              <div className="space-y-3">
                <input className="w-full px-5 py-3.5 glass-input border-none rounded-2xl font-bold text-slate-900 uppercase placeholder:text-slate-400 focus:bg-slate-50 transition-all text-[11px]" placeholder="SEU NOME COMPLETO" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                <input className="w-full px-5 py-3.5 glass-input border-none rounded-2xl font-bold text-slate-900 uppercase placeholder:text-slate-400 focus:bg-slate-50 transition-all text-[11px]" placeholder="E-MAIL" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                <input className="w-full px-5 py-3.5 glass-input border-none rounded-2xl font-bold text-slate-900 uppercase placeholder:text-slate-400 focus:bg-slate-50 transition-all text-[11px]" placeholder="CPF" value={form.taxId} onChange={(e) => setForm({...form, taxId: e.target.value})} required />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full primary-gradient text-white py-4 rounded-2xl font-black text-[11px] tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <QrCode size={18} />}
                {loading ? 'PREPARANDO...' : `GERAR PIX DE R$ ${selectedPlan?.amount.toFixed(2).replace('.', ',')}`}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center space-y-5 max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setStep('form')} className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 rounded-xl hover:bg-slate-200">
                <ArrowLeft size={16} />
              </button>
              <div className="w-8"></div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">ESCANEIE O PIX</h2>
              <p className="text-slate-500 font-medium text-[10px] tracking-widest uppercase">ESCANEIE O QR CODE ABAIXO COM O APP DO SEU BANCO.</p>
            </div>

            <div className="bg-white p-4 rounded-3xl inline-block shadow-inner border-2 border-slate-100 ring-1 ring-slate-200">
              {paymentData?.qr_code_base64 && (
                <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="PIX QR Code" className="w-40 h-40 mix-blend-multiply" />
              )}
            </div>
            
            <div className="text-rose-500 font-bold text-[10px] uppercase tracking-widest mt-2">
              EXPIRA EM: {formatTime(expiresIn)}
            </div>

            <div className="space-y-3">
              <div className="p-3 glass-panel rounded-2xl border border-slate-200 bg-slate-50/50 relative group cursor-pointer" onClick={copyToClipboard}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CÓDIGO COPIA E COLA</p>
                <p className="text-[10px] text-slate-600 font-mono break-all leading-tight px-4 uppercase line-clamp-2">{paymentData?.qr_code}</p>
                <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                   <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black shadow-sm flex items-center gap-1"><Copy size={10}/> CLIQUE PARA COPIAR</span>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full primary-gradient text-white py-3 rounded-2xl font-black text-[11px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {checking ? <RefreshCw className="animate-spin" size={16} /> : null}
                  JÁ EFETUEI O PAGAMENTO
                </button>
                
                {paymentErrorMsg && (
                  <div className="text-rose-500 font-black text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                    {paymentErrorMsg}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-slate-400 animate-pulse pt-2">
                   <RefreshCw size={10} />
                   <span className="text-[9px] font-black uppercase tracking-widest">AGUARDANDO CONFIRMAÇÃO AUTOMÁTICA...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
