import { supabase } from './supabase';
import OneSignal from 'react-onesignal';

export const setupPushNotifications = (userId: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Tenta pegar do .env, se não achar, usa o valor fixo (fallback para o APK)
      const appId = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID || "75808b28-ebd4-4db0-a3db-55a3360eab13";
      
      if (!appId) {
        alert("OneSignal App ID não configurado");
        return reject(new Error("App ID missing"));
      }

      // 1. LÓGICA PARA MEDIAN.CO (NATIVO)
      // O Median injeta o objeto window.median quando roda dentro do APK/iOS
      if ((window as any).median) {
        console.log("Rodando dentro do Median.co");
        
        // Pede permissão nativa
        (window as any).median.onesignal.register();

        let attempts = 0;
        const checkMedianToken = () => {
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
                reject(error);
              } else {
                console.log('Token Nativo salvo com sucesso na coluna push_token!');
                alert("Notificações ativadas com sucesso neste dispositivo!");
                resolve();
              }
            } else {
              attempts++;
              if (attempts < 10) {
                setTimeout(checkMedianToken, 2000); // Tenta novamente a cada 2 segundos (máx 20s)
              } else {
                alert("Não foi possível obter o token do dispositivo. Verifique se você deu permissão de notificação.");
                reject(new Error("Timeout waiting for token"));
              }
            }
          }).catch((err: any) => {
            console.error("Erro ao obter info do Median:", err);
            reject(err);
          });
        };
        
        checkMedianToken();
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
          alert('As notificações push não estão configuradas para funcionar no navegador web. Elas funcionarão normalmente no aplicativo do celular (APK).');
          return reject(new Error('Web push not configured')); // Lança erro para o Dashboard saber que falhou
        } else {
          return reject(e);
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
          reject(error);
        } else {
          console.log('Token Web salvo com sucesso na coluna push_token!');
          alert("Notificações ativadas com sucesso neste dispositivo!");
          resolve();
        }
      } else {
        // Se não pegou o ID na hora, adiciona um listener
        OneSignal.User.PushSubscription.addEventListener("change", async (subscription) => {
          if (subscription.current.id) {
            await supabase
              .from('profiles')
              .update({ push_token: subscription.current.id }) 
              .eq('id', userId);
            resolve();
          }
        });
        alert("Permissão concedida! O ID será salvo em instantes.");
      }
    } catch (err: any) {
      console.error('Setup failed:', err);
      const msg = err.message || String(err);
      if (msg.includes('already initialized')) {
        console.log('OneSignal já inicializado.');
        resolve();
      } else if (msg.includes('App not configured for web push') || msg.includes('Web push not configured')) {
        // The alert was already shown in the inner catch block, so we just log it here or do nothing
        console.log('Web push not configured, handled in inner catch.');
        reject(err); // Re-throw to let Dashboard know it failed
      } else {
        alert(`Erro ao configurar notificações: ${msg}`);
        reject(err); // Re-throw to let Dashboard know it failed
      }
    }
  });
};
