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
        let tokenFound = false;
        
        // O Median.co usa callbacks globais para retornar dados da ponte JS
        (window as any).onesignalInfoCallback = async (info: any) => {
          if (tokenFound) return;
          console.log("Median OneSignal Info recebido:", JSON.stringify(info));
          
          // O formato do info pode variar um pouco dependendo da versão do Median
          const playerId = info?.oneSignalUserId || info?.userId || info?.playerId;
          
          if (playerId) {
            tokenFound = true;
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
          }
        };

        // Usa setInterval para garantir que vamos continuar perguntando ao Median
        // mesmo se o callback falhar ou demorar
        const pollInterval = setInterval(() => {
          if (tokenFound) {
            clearInterval(pollInterval);
            return;
          }

          attempts++;
          if (attempts >= 15) { // 30 segundos no total
            clearInterval(pollInterval);
            alert("O aplicativo não conseguiu gerar o token de notificação.\n\nVerifique 2 coisas:\n1. Você gerou um NOVO APK (Rebuild) no Median APÓS inserir o App ID?\n2. No painel do OneSignal, você configurou o 'Google Android (FCM)'?");
            reject(new Error("Timeout waiting for token"));
            return;
          }

          try {
            if ((window as any).median && (window as any).median.onesignal) {
              (window as any).median.onesignal.info({ callback: 'onesignalInfoCallback' });
            }
          } catch (e) {
            console.error("Erro ao chamar median.onesignal.info:", e);
          }
        }, 2000);
        
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
      const msg = err.message || String(err);
      if (msg.includes('already initialized')) {
        console.log('OneSignal já inicializado.');
        resolve();
      } else if (msg.includes('App not configured for web push') || msg.includes('Web push not configured')) {
        // The alert was already shown in the inner catch block, so we just log it here or do nothing
        console.log('Web push not configured, handled in inner catch.');
        reject(err); // Re-throw to let Dashboard know it failed
      } else {
        console.error('Setup failed:', err);
        alert(`Erro ao configurar notificações: ${msg}`);
        reject(err); // Re-throw to let Dashboard know it failed
      }
    }
  });
};
