
import { Database, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

const SchemaError: React.FC = () => {
  const sqlCode = `-- 🚀 SCRIPT DE CORREÇÃO DEFINITIVA AGICRED
-- RODE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA LIBERAR EXCLUSÕES E PAGAMENTOS

-- 1. Garante que as colunas necessárias existem
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_plain text;

-- 2. Atualiza registros que podem estar nulos para evitar erros matemáticos
UPDATE public.contracts SET paid_amount = 0 WHERE paid_amount IS NULL;

-- 3. Habilita RLS explicitamente se não estiver
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Garante que as permissões de acesso (SELECT, INSERT, UPDATE, DELETE) estão totalmente liberadas para o dono
DROP POLICY IF EXISTS "Contracts: Manage own" ON public.contracts;
CREATE POLICY "Contracts: Manage own" ON public.contracts 
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clients: Manage own" ON public.clients;
CREATE POLICY "Clients: Manage own" ON public.clients 
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. FORÇA O SUPABASE A RECONHECER AS MUDANÇAS IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    alert("Script copiado! Vá ao Supabase > SQL Editor e clique em 'RUN'.");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 lg:p-8 uppercase font-bold text-slate-900">
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] primary-gradient z-[60]" />
      <div className="max-w-2xl w-full glass-panel rounded-[2.5rem] shadow-2xl p-8 lg:p-12 border border-slate-200 space-y-8 animate-in zoom-in duration-300">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-50 text-emerald-600 p-5 rounded-3xl shrink-0 shadow-inner border border-emerald-200">
            <Database size={38} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">AJUSTE DE PERMISSÕES</h1>
            <p className="text-slate-500 text-[11px] mt-2 font-black tracking-widest uppercase opacity-70">LIBERAÇÃO DE EXCLUSÃO E CACHE</p>
          </div>
        </div>

        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl flex items-start gap-4">
          <AlertTriangle size={24} className="text-rose-500 shrink-0" />
          <p className="text-[10px] text-rose-600 leading-relaxed font-black uppercase">
            IMPORTANTE: SE O BOTÃO DE EXCLUIR NÃO FUNCIONAR, É PORQUE O SUPABASE ESTÁ BLOQUEANDO A AÇÃO POR SEGURANÇA. COPIE O SCRIPT ABAIXO E EXECUTE NO SQL EDITOR DO SEU PROJETO.
          </p>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 relative group overflow-hidden border border-slate-800 shadow-2xl">
          <button onClick={copyToClipboard} className="absolute top-5 right-5 bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase shadow-lg active:scale-95">
            <Copy size={16} /> COPIAR SCRIPT
          </button>
          <pre className="text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap pt-12 max-h-64 no-scrollbar uppercase tracking-tighter leading-tight">
            {sqlCode}
          </pre>
        </div>

        <div className="space-y-4 pt-2">
            <button onClick={() => window.location.reload()} className="w-full primary-gradient text-white h-16 rounded-3xl font-black text-xs hover:shadow-violet-500/25 transition-all shadow-xl uppercase tracking-[0.3em] active:scale-98 flex items-center justify-center gap-2">
                REINICIAR SISTEMA <RefreshCw size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default SchemaError;
