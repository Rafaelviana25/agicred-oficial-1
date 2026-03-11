import { supabase } from './supabase';
import { messaging, getToken, onMessage } from './firebase';

let isSettingUp = false;

export const setupPushNotifications = async (userId: string): Promise<void> => {
  if (isSettingUp) return;
  isSettingUp = true;

  try {
    console.log("Iniciando configuração de notificações Firebase...");

    // Verifica se o navegador suporta notificações
    if (!("Notification" in window)) {
      console.log("Este navegador não suporta notificações desktop");
      isSettingUp = false;
      return;
    }

    // Solicita permissão
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Permissão de notificação concedida.");
      
      // Registra o Service Worker explicitamente para evitar erros de timeout
      let registration;
      if ('serviceWorker' in navigator) {
        try {
          // Verifica se já existe um registro
          const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          if (existingReg) {
            registration = existingReg;
            console.log("Service Worker já registrado.");
          } else {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
              scope: '/'
            });
            console.log("Service Worker registrado com sucesso:", registration);
          }
          
          // Aguarda o service worker estar pronto
          await navigator.serviceWorker.ready;
          console.log("Service Worker está pronto.");
          
          // Pequeno delay adicional para garantir a inicialização
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (swError) {
          console.error("Erro ao registrar Service Worker:", swError);
        }
      } else {
        console.warn("Service Workers não são suportados neste navegador.");
      }
      
      // Obtém o token FCM
      // O VAPID KEY é necessário para web push
      const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
      
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log("Token FCM obtido:", token);
        
        // Salva o token no perfil do usuário no Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);

        if (error) {
          console.error('Erro ao salvar token no Supabase:', error);
          throw error;
        }

        console.log('Token Firebase salvo com sucesso!');
        
        // Listener para mensagens em primeiro plano
        onMessage(messaging, (payload) => {
          console.log('Mensagem recebida em primeiro plano:', payload);
          // Aqui você pode mostrar um toast ou notificação customizada
          if (payload.notification) {
            alert(`${payload.notification.title}: ${payload.notification.body}`);
          }
        });

      } else {
        console.warn("Nenhum token de registro disponível. Solicite permissão para gerar um.");
      }
    } else {
      console.warn("Permissão de notificação negada.");
    }
  } catch (error) {
    console.error("Erro ao configurar notificações Firebase:", error);
    throw error;
  } finally {
    isSettingUp = false;
  }
};
