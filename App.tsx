
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { setupLocalNotifications } from './services/localNotifications';
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import SchemaError from './views/SchemaError';
import { UserProfile } from './types';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [hasSchemaError, setHasSchemaError] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    // Configurar Barra de Status no Android/iOS
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: Style.Dark }); // Texto branco
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.setBackgroundColor({ color: '#7C3AED' });
      } catch (err) {
        console.error('Erro ao configurar StatusBar:', err);
      }
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error);
        supabase.auth.signOut().catch(console.error);
        setSession(null);
      } else {
        setSession(session);
        if (session) fetchProfile(session.user.id, session);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Session catch error:", err);
      supabase.auth.signOut().catch(console.error);
      setSession(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
      if (event === 'SIGNED_OUT') {
        setIsRecoveringPassword(false);
      }
      setSession(session);
      if (session && event !== 'PASSWORD_RECOVERY') fetchProfile(session.user.id, session);
      else if (!session) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, currentSession: any) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const now = new Date();
    const trialExpires = new Date();
    trialExpires.setDate(now.getDate() + 7);

    const fallbackProfile = {
      id: userId,
      email: currentSession?.user?.email || '',
      full_name: currentSession?.user?.user_metadata?.full_name || 'Usuário',
      cpf: currentSession?.user?.user_metadata?.cpf || '',
      phone: currentSession?.user?.user_metadata?.phone || '',
      is_pro: false,
      is_trial: true,
      trial_started_at: now.toISOString(),
      trial_expires_at: trialExpires.toISOString(),
      created_at: now.toISOString()
    };

    if (error) {
      console.error('Error fetching profile:', error);
      if (error.code === 'PGRST205') {
        setHasSchemaError(true);
      } else {
        setProfile(fallbackProfile);
      }
      return;
    }

    if (data) {
      // Verifica se o plano PRO ou TRIAL expirou
      let needsUpdate = false;
      const updates: any = {};

      if (data.is_pro && data.pro_expires_at && new Date(data.pro_expires_at) < now) {
        updates.is_pro = false;
        needsUpdate = true;
      }

      if (data.is_trial && data.trial_expires_at && new Date(data.trial_expires_at) < now) {
        updates.is_trial = false;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();
          
        if (!updateError && updatedData) {
          setProfile(updatedData);
        } else {
          setProfile({ ...data, ...updates });
        }
      } else {
        setProfile(data);
      }
      setHasSchemaError(false);
      setupLocalNotifications();
    } else {
      // Usuário logado mas sem registro na tabela profiles
      // Tentar criar perfil básico automaticamente
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error auto-creating profile:', createError);
        // Se falhar (ex: race condition com Register.tsx), aguarda um pouco e tenta buscar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
          
        if (retryData) {
          setProfile(retryData);
        } else {
          // Fallback final para garantir que o app não quebre
          setProfile(fallbackProfile);
        }
      } else {
        setProfile(newProfile);
      }
    }
  };

  const handleProfileComplete = () => {
    if (session) fetchProfile(session.user.id, session);
  };

  if (hasSchemaError) {
    return <SchemaError />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session || isRecoveringPassword) {
    return view === 'login' 
      ? <Login onSwitch={() => setView('register')} onRecoveryMode={(mode) => setIsRecoveringPassword(mode)} /> 
      : <Register onSwitch={() => setView('login')} />;
  }

  return <Dashboard userProfile={profile} onUpgradeSuccess={handleProfileComplete} />;
};

export default App;
