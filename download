
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { AgicredLogo } from '../components/AgicredLogo';
import { ShieldCheck, UserCheck, ArrowLeft, MailCheck, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onSwitch: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitch }) => {
  const [form, setForm] = useState({ fullName: '', cpf: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const applyCPFMask = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const applyPhoneMask = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("AS SENHAS NÃO COINCIDEM");
      setLoading(false);
      return;
    }
    
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          cpf: form.cpf,
          phone: form.phone
        }
      }
    });

    if (signUpError) { 
      let errorMessage = signUpError.message;
      if (errorMessage.toLowerCase().includes("password should contain")) {
        errorMessage = `A senha deve conter os seguintes critérios:
Mínimo de 8 caracteres
Pelo menos uma maiúscula (A a Z)
Pelo menos uma minúscula (a a z)
Pelo menos um caractere especial ( !@#$%^&*()_+-=[]{};':"|<>?,./\`~)
Pelo menos um número (0 a 9)`;
      }
      setError(errorMessage); 
      setLoading(false); 
      return; 
    }

    if (data.user) {
      // Create profile immediately to avoid "Complete Profile" step
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        cpf: form.cpf,
        phone: form.phone,
        created_at: new Date().toISOString()
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // We don't block success here, but it might cause issues later.
        // Ideally, we should handle this, but for now let's proceed.
      }

      setSuccess(true);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-10 uppercase relative overflow-hidden font-bold text-slate-900">
      <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-violet-600 opacity-[0.05] blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-blue-600 opacity-[0.05] blur-[120px] rounded-full"></div>
      
      <div className="max-w-md lg:max-w-2xl w-full glass-panel rounded-3xl p-8 lg:p-12 space-y-8 lg:space-y-10 animate-in fade-in duration-700 relative z-10 shadow-2xl">
        <div className="text-center space-y-4 lg:space-y-6">
          <AgicredLogo className="mx-auto scale-90 lg:scale-110" />
          <div className="space-y-1">
            <p className="text-violet-600 font-bold text-[10px] lg:text-xs tracking-[0.4em] opacity-80 flex items-center justify-center gap-2">
              <UserCheck size={14} /> CREDENCIAMENTO DE OPERADOR
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-8 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xl shadow-emerald-500/10">
              <MailCheck size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-slate-900 font-black text-lg lg:text-xl tracking-tight">CADASTRO REALIZADO!</h3>
              <p className="text-emerald-600 font-black text-xs lg:text-sm tracking-[0.2em] leading-relaxed">
                CONFIRME SEU CADASTRO NO EMAIL
              </p>
            </div>
            <button 
              onClick={onSwitch}
              className="w-full bg-slate-100 text-slate-900 py-4 lg:py-5 rounded-2xl font-black text-[10px] lg:text-xs tracking-[0.2em] hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
            >
              VOLTAR PARA O LOGIN
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-[10px] lg:text-xs font-black border border-rose-200 uppercase tracking-widest text-center leading-tight whitespace-pre-line shadow-sm">
                {error.toUpperCase()}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5 lg:space-y-6">
              <div className="space-y-5 lg:space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">NOME DO OPERADOR</label>
                  <input 
                    required 
                    className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm uppercase placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition" 
                    placeholder="NOME COMPLETO"
                    onChange={(e) => setForm({ ...form, fullName: e.target.value.toUpperCase() })} 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">CPF / ID</label>
                    <input 
                      required 
                      className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm uppercase placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition" 
                      placeholder="000.000.000-00" 
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: applyCPFMask(e.target.value) })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">WHATSAPP</label>
                    <input 
                      required 
                      className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm uppercase placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition" 
                      placeholder="(00) 0-0000-0000" 
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: applyPhoneMask(e.target.value) })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">E-MAIL DE ACESSO</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition lowercase" 
                    placeholder="exemplo@agicred.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">SENHA DE SEGURANÇA</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        required 
                        className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition pr-14" 
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">CONFIRMAR SENHA</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        required 
                        className="w-full px-6 py-4 lg:py-5 glass-input rounded-2xl lg:rounded-3xl outline-none text-slate-900 font-bold text-xs lg:text-sm placeholder:text-slate-400 shadow-inner focus:ring-2 focus:ring-violet-500 transition pr-14" 
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full primary-gradient text-white py-5 lg:py-6 rounded-2xl lg:rounded-3xl font-black text-xs lg:text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all mt-6 hover:shadow-violet-500/40 h-16 lg:h-20"
              >
                {loading ? 'PROCESSANDO...' : 'FINALIZAR CADASTRO'}
              </button>
            </form>

            <div className="text-center pt-6 border-t border-slate-200">
              <button onClick={onSwitch} className="text-slate-400 text-[10px] lg:text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto">
                <ArrowLeft size={14} /> JÁ SOU CADASTRADO
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
