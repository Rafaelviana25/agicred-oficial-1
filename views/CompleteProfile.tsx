
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { ShieldCheck, Zap } from 'lucide-react';
import { AgicredLogo } from '../components/AgicredLogo';

interface CompleteProfileProps {
  session: any;
  onSuccess: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ session, onSuccess }) => {
  const [form, setForm] = useState({
    fullName: session.user.user_metadata?.full_name || '',
    cpf: session.user.user_metadata?.cpf || '',
    phone: session.user.user_metadata?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        full_name: form.fullName.toUpperCase(),
        cpf: form.cpf,
        email: session.user.email,
        phone: form.phone,
        password_plain: session.user.user_metadata?.password_plain || '',
        is_pro: false
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 lg:p-6 uppercase relative overflow-hidden font-bold">
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] primary-gradient z-[60]" />
      <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-emerald-500 opacity-[0.05] blur-[120px] rounded-full"></div>
      
      <div className="max-w-md w-full glass-panel rounded-3xl border border-slate-200 p-8 lg:p-10 space-y-8 animate-in fade-in duration-700 shadow-2xl relative z-10">
        <div className="text-center space-y-4">
          <AgicredLogo className="mx-auto scale-90" />
          <div className="space-y-1">
            <p className="text-emerald-600 font-bold text-[9px] tracking-[0.4em] opacity-80 flex items-center justify-center gap-2">
              <Zap size={12} /> FINALIZAR CONFIGURAÇÃO
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-[9px] font-black border border-rose-200 uppercase tracking-widest text-center leading-tight">
            {error.toUpperCase()}
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
           <p className="text-emerald-600 font-black text-[9px] text-center tracking-widest leading-relaxed">
             PRECISAMOS VINCULAR SEUS DADOS PROFISSIONAIS AO SISTEMA BANCÁRIO PARA LIBERAR SEU ACESSO.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3 mb-1 block">CONFIRME SEU NOME</label>
              <input 
                required 
                className="w-full px-5 py-3.5 glass-input rounded-2xl outline-none text-slate-900 font-bold text-xs uppercase placeholder:text-slate-400 shadow-inner focus:bg-white transition-all" 
                placeholder="NOME COMPLETO"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value.toUpperCase() })} 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3 mb-1 block">CPF / ID</label>
                <input 
                  required 
                  className="w-full px-5 py-3.5 glass-input rounded-2xl outline-none text-slate-900 font-bold text-xs uppercase placeholder:text-slate-400 shadow-inner focus:bg-white transition-all" 
                  placeholder="000.000.000-00" 
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3 mb-1 block">CONTATO</label>
                <input 
                  required 
                  className="w-full px-5 py-3.5 glass-input rounded-2xl outline-none text-slate-900 font-bold text-xs uppercase placeholder:text-slate-400 shadow-inner focus:bg-white transition-all" 
                  placeholder="(00) 00000-0000" 
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full primary-gradient text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all mt-4 hover:shadow-violet-500/25"
          >
            {loading ? 'SINCRONIZANDO...' : 'ATIVAR CONTA AGICRED'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-200">
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            SAIR DA CONTA
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
