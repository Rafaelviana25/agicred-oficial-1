import { supabase } from './supabase';
import OneSignal from 'react-onesignal';

export const setupPushNotifications = async (userId: string) => {
  try {
    // Tenta pegar do .env, se não achar, usa o valor fixo (fallback para o APK)
    const appId = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID || "75808b28-ebd4-4db0-a3db-55a3360eab13";
    
    if (!appId) {
      alert("OneSignal App ID não configurado");
      return;
    }

    // 1. LÓGICA PARA MEDIAN.CO (NATIVO)
    // O Median injeta o objeto window.median quando roda dentro do APK/iOS
    if ((window as any).median) {
      console.log("Rodando dentro do Median.co");
      
      // Pede permissão nativa
      (window as any).median.onesignal.register();

      // Pega o ID do OneSignal via ponte do Median
      (window as any).median.onesignal.info().then(async (info: any) => {
        const playerId = info.oneSignalUserId;
        if (playerId) {
          const { error } = await supabase
            .from('profiles')
            .update({ push_token: playerId }) 
            .eq('id', userId);

          if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            alert("Erro ao salvar o token de notificação no banco de dados.");
          } else {
            console.log('Token Nativo salvo com sucesso na coluna push_token!');
            alert("Notificações ativadas com sucesso neste dispositivo!");
          }
        }
      });
      return;
    }

    // 2. LÓGICA PARA WEB (PREVIEW / NAVEGADOR)
    console.log("Rodando no Navegador Web");
    
    try {
      // Verifica se já foi inicializado para evitar o erro "SDK already initialized"
      if (!(OneSignal as any).initialized) {
        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          } as any,
        });
      }
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('already initialized')) {
        console.log('OneSignal já inicializado.');
      } else if (msg.includes('App not configured for web push') || msg.toLowerCase().includes('not configured')) {
        console.warn('OneSignal não está configurado para Web Push neste App ID ou a URL não bate com a configurada no painel.');
        // alert('As notificações push não estão configuradas para funcionar no navegador web. Elas funcionarão normalmente no aplicativo do celular.');
        return; // Sai da função pois o web push não vai funcionar
      } else {
        throw e;
      }
    }

    // Pede permissão ao usuário
    await OneSignal.Slidedown.promptPush();

    // Pega o ID do usuário (Subscription ID)
    const subscriptionId = OneSignal.User.PushSubscription.id;

    if (subscriptionId) {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: subscriptionId }) 
        .eq('id', userId);

      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        alert("Erro ao salvar o token de notificação no banco de dados.");
      } else {
        console.log('Token Web salvo com sucesso na coluna push_token!');
        alert("Notificações ativadas com sucesso neste dispositivo!");
      }
    } else {
      // Se não pegou o ID na hora, adiciona um listener
      OneSignal.User.PushSubscription.addEventListener("change", async (subscription) => {
        if (subscription.current.id) {
          await supabase
            .from('profiles')
            .update({ push_token: subscription.current.id }) 
            .eq('id', userId);
        }
      });
      alert("Permissão concedida! O ID será salvo em instantes.");
    }
  } catch (err: any) {
    console.error('Setup failed:', err);
    const msg = err.message || String(err);
    if (msg.includes('already initialized')) {
      console.log('OneSignal já inicializado.');
    } else if (msg.includes('App not configured for web push')) {
      alert('As notificações push não estão configuradas para funcionar no navegador web. Elas funcionarão normalmente no aplicativo do celular.');
    } else {
      alert(`Erro ao configurar notificações: ${msg}`);
    }
  }
};
