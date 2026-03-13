
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ArrowRight, Eye, EyeOff, Lock, User, Mail, Fingerprint, KeyRound, RefreshCw } from 'lucide-react';
import { AgicredLogo } from '../components/AgicredLogo';

interface LoginProps {
  onSwitch: () => void;
  onRecoveryMode?: (mode: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onSwitch, onRecoveryMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password States
  const [mode, setMode] = useState<'login' | 'forgot' | 'change'>('login');
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [recoveryData, setRecoveryData] = useState({ fullName: '', cpf: '', email: '' });
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Change Password States
  const [changeData, setChangeData] = useState({ email: '', oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [changeSuccess, setChangeSuccess] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('agicred_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (rememberMe) {
      localStorage.setItem('agicred_remembered_email', email);
    } else {
      localStorage.removeItem('agicred_remembered_email');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      setError("CREDENCIAIS INVÁLIDAS OU ERRO DE ACESSO");
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile?.is_pro) {
        await supabase.auth.signOut();
        setError("ACESSO NEGADO - ASSINE O PRO PARA TER ACESSO");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryData.email) {
      setRecoveryError("INSIRA SEU E-MAIL");
      return;
    }
    setLoading(true);
    setRecoveryError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryData.email);
      if (error) throw error;
      setRecoveryStep('otp');
    } catch (err: any) {
      setRecoveryError("ERRO AO ENVIAR TOKEN: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryOtp || recoveryOtp.length !== 6) {
      setRecoveryError("INSIRA O TOKEN DE 6 DÍGITOS");
      return;
    }
    setLoading(true);
    setRecoveryError(null);
    if (onRecoveryMode) onRecoveryMode(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: recoveryData.email,
        token: recoveryOtp,
        type: 'recovery'
      });
      if (error) {
        if (onRecoveryMode) onRecoveryMode(false);
        throw error;
      }
      
      setRecoveryStep('reset');
    } catch (err: any) {
      setRecoveryError("TOKEN INVÁLIDO OU EXPIRADO");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setRecoveryError("AS SENHAS NÃO COINCIDEM");
      return;
    }
    setLoading(true);
    setRecoveryError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        let errorMessage = error.message;
        if (errorMessage.toLowerCase().includes("password should contain")) {
          errorMessage = `A senha deve conter os seguintes critérios:\nMínimo de 8 caracteres\nPelo menos uma maiúscula (A a Z)\nPelo menos uma minúscula (a a z)\nPelo menos um caractere especial ( !@#$%^&*()_+-=[]{};':"|<>?,./\`~)\nPelo menos um número (0 a 9)`;
        }
        throw new Error(errorMessage);
      }
      
      // Update in profiles
      await supabase.from('profiles').update({ password_plain: newPassword }).eq('email', recoveryData.email);
      
      // Sign out the user so they are forced to login with the new password
      try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
      if (onRecoveryMode) onRecoveryMode(false);
      
      setChangeSuccess(true);
      setTimeout(() => {
        setMode('login');
        setRecoveryStep('email');
        setRecoveryData({ fullName: '', cpf: '', email: '' });
        setRecoveryOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setChangeSuccess(false);
      }, 2000);
    } catch (err: any) {
      setRecoveryError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeData.newPassword !== changeData.confirmNewPassword) {
      setError("AS SENHAS NÃO COINCIDEM");
      return;
    }
    setLoading(true);
    setError(null);
    setChangeSuccess(false);

    // First try to sign in with old password to verify
    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email: changeData.email, 
      password: changeData.oldPassword 
    });

    if (signInError) {
      setError("DADOS ATUAIS INCORRETOS");
      setLoading(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: changeData.newPassword 
    });

    if (updateError) {
      let errorMessage = updateError.message;
      if (errorMessage.toLowerCase().includes("password should contain")) {
        errorMessage = `A senha deve conter os seguintes critérios:
Mínimo de 8 caracteres
Pelo menos uma maiúscula (A a Z)
Pelo menos uma minúscula (a a z)
Pelo menos um caractere especial ( !@#$%^&*()_+-=[]{};':"|<>?,./\`~)
Pelo menos um número (0 a 9)`;
      }
      setError(errorMessage);
    } else {
      // Also update in profiles if we are storing it there
      await supabase.from('profiles').update({ password_plain: changeData.newPassword }).eq('email', changeData.email);
      
      // Sign out the user so they are forced to login with the new password
      try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
      
      setChangeSuccess(true);
      setTimeout(() => {
        setMode('login');
        setChangeData({ email: '', oldPassword: '', newPassword: '', confirmNewPassword: '' });
        setChangeSuccess(false);
      }, 2000);
    }
    
    setLoading(false);
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 uppercase overflow-hidden relative font-bold text-slate-900">
        <div className="w-[90%] max-w-sm glass-panel rounded-3xl p-6 lg:p-8 space-y-6 relative z-10">
          <div className="text-center space-y-1">
            <AgicredLogo className="mx-auto scale-90 lg:scale-100" />
            <p className="text-[9px] text-violet-600 tracking-[0.3em] mt-2">RECUPERAÇÃO DE ACESSO</p>
          </div>

          {recoveryError && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[8px] font-black border border-rose-200 text-center">
              {recoveryError}
            </div>
          )}

          {changeSuccess && recoveryStep === 'reset' ? (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3 animate-in zoom-in">
              <p className="text-[9px] text-emerald-600 tracking-widest font-black">SENHA ALTERADA COM SUCESSO!</p>
            </div>
          ) : recoveryStep === 'reset' ? (
            <div className="space-y-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">CRIAR NOVA SENHA</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                      placeholder="••••••••"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">CONFIRMAR NOVA SENHA</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                      placeholder="••••••••"
                      value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full primary-gradient text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                  {loading ? 'ALTERANDO...' : 'ALTERAR SENHA'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onRecoveryMode) onRecoveryMode(false);
                    setMode('login');
                    setRecoveryStep('email');
                  }}
                  className="w-full text-slate-400 text-[8px] font-black hover:text-slate-900 transition-colors"
                >
                  VOLTAR AO LOGIN
                </button>
              </form>
            </div>
          ) : recoveryStep === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-[9px] text-slate-500 tracking-widest">ENVIAMOS UM TOKEN PARA</p>
                <p className="text-[10px] font-black text-slate-900 lowercase">{recoveryData.email}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">TOKEN DE 6 DÍGITOS</label>
                <input
                  className="w-full px-4 py-3 glass-input rounded-xl text-center text-xl tracking-[0.5em] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-300"
                  placeholder="000000"
                  maxLength={6}
                  value={recoveryOtp} onChange={e => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full primary-gradient text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                {loading ? 'VERIFICANDO...' : 'VERIFICAR TOKEN'}
              </button>
              <button 
                type="button"
                onClick={() => setRecoveryStep('email')}
                className="w-full text-slate-400 text-[8px] font-black hover:text-slate-900 transition-colors"
              >
                TENTAR OUTRO E-MAIL
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">E-MAIL CADASTRADO</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400 lowercase"
                  placeholder="seu@email.com"
                  value={recoveryData.email} onChange={e => setRecoveryData({...recoveryData, email: e.target.value})}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full primary-gradient text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                {loading ? 'ENVIANDO...' : 'ENVIAR TOKEN'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (onRecoveryMode) onRecoveryMode(false);
                  setMode('login');
                }}
                className="w-full text-slate-400 text-[8px] font-black hover:text-slate-900 transition-colors"
              >
                CANCELAR
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'change') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 uppercase overflow-hidden relative font-bold text-slate-900">
        <div className="w-[90%] max-w-sm glass-panel rounded-3xl p-6 lg:p-8 space-y-6 relative z-10">
          <div className="text-center space-y-1">
            <AgicredLogo className="mx-auto scale-90 lg:scale-100" />
            <p className="text-[9px] text-violet-600 tracking-[0.3em] mt-2">ALTERAR SENHA</p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[8px] font-black border border-rose-200 text-center whitespace-pre-line">
              {error}
            </div>
          )}

          {changeSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3 animate-in zoom-in">
              <p className="text-[9px] text-emerald-600 tracking-widest font-black">SENHA ALTERADA COM SUCESSO!</p>
              <p className="text-[8px] text-slate-500">REDIRECIONANDO...</p>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">E-MAIL</label>
                <input
                  type="email" required
                  className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                  placeholder="SEU E-MAIL"
                  value={changeData.email} onChange={e => setChangeData({...changeData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">SENHA ATUAL</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required
                    className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={changeData.oldPassword} onChange={e => setChangeData({...changeData, oldPassword: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">NOVA SENHA</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required
                    className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={changeData.newPassword} onChange={e => setChangeData({...changeData, newPassword: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 tracking-widest ml-3 block">CONFIRMAR NOVA SENHA</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required
                    className="w-full px-4 py-3 glass-input rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={changeData.confirmNewPassword} onChange={e => setChangeData({...changeData, confirmNewPassword: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full primary-gradient text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                {loading ? 'PROCESSANDO...' : 'CONFIRMAR ALTERAÇÃO'}
              </button>
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-slate-400 text-[8px] font-black hover:text-slate-900 transition-colors"
              >
                CANCELAR
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 uppercase overflow-hidden relative font-bold text-slate-900 pt-safe-native">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600 opacity-[0.05] blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 opacity-[0.05] blur-[120px] rounded-full"></div>
      
      <div className="w-[90%] max-w-sm glass-panel rounded-3xl p-6 lg:p-8 space-y-6 animate-in fade-in zoom-in duration-700 relative z-10 shadow-2xl">
        <div className="text-center space-y-2">
          <AgicredLogo className="mx-auto scale-90 lg:scale-100" />
          <div className="h-1 w-8 bg-violet-500 mx-auto rounded-full mt-2 opacity-60"></div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[9px] font-black border border-rose-200 uppercase tracking-widest text-center leading-tight shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3 block">OPERADOR</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email" required
                className="w-full pl-11 pr-4 py-3 glass-input rounded-xl focus:ring-2 focus:ring-violet-500 transition text-slate-900 font-bold text-xs outline-none placeholder:text-slate-400 lowercase shadow-inner"
                placeholder="e-mail"
                value={email} onChange={e => setEmail(e.target.value.toLowerCase())}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3 block">SENHA</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? "text" : "password"} required
                className="w-full pl-11 pr-11 py-3 glass-input rounded-xl focus:ring-2 focus:ring-violet-500 transition text-slate-900 font-bold text-xs outline-none placeholder:text-slate-400 shadow-inner"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-violet-500 border-violet-500' : 'border-slate-300 bg-slate-50'}`}>
                {rememberMe && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={rememberMe} 
                onChange={() => setRememberMe(!rememberMe)} 
              />
              <span className="text-[9px] font-black text-slate-500 group-hover:text-slate-700 tracking-widest">LEMBRAR USUÁRIO</span>
            </label>
            
            <button 
              type="button"
              onClick={() => setMode('forgot')}
              className="text-[9px] font-black text-violet-600 hover:text-violet-500 tracking-widest"
            >
              ESQUECI A SENHA
            </button>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full primary-gradient text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-violet-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'AUTENTICANDO...' : 'ACESSAR AGICRED'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="space-y-3 text-center pt-2">
          <button 
            onClick={() => setMode('change')}
            className="text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors block mx-auto"
          >
            TROCAR DE SENHA
          </button>
          <button onClick={onSwitch} className="text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors">
            CRIAR CONTA DE OPERADOR
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

