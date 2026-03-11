import { supabase } from './supabase';
import { messaging, getToken, onMessage } from './firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let isSettingUp = false;

export const setupPushNotifications = async (userId: string): Promise<void> => {
  if (isSettingUp) return;
  isSettingUp = true;

  try {
    console.log("Iniciando configuração de notificações...");

    if (Capacitor.isNativePlatform()) {
      // Configuração NATIVA (Android/iOS via Capacitor)
      console.log("Plataforma nativa detectada. Configurando Capacitor Push Notifications...");
      
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn("Permissão de notificação nativa negada.");
        isSettingUp = false;
        return;
      }

      // Registra no FCM nativo
      await PushNotifications.register();

      // Listener de registro bem-sucedido (recebe o token nativo)
      PushNotifications.addListener('registration', async (token) => {
        console.log("Token FCM Nativo obtido:", token.value);
        
        // Salva o token no perfil do usuário no Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token.value })
          .eq('id', userId);

        if (error) {
          console.error('Erro ao salvar token nativo no Supabase:', error);
        } else {
          console.log('Token nativo salvo com sucesso!');
        }
      });

      // Listener de erro no registro
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Erro no registro de push nativo:', error);
      });

      // Listener de mensagem recebida em primeiro plano
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notificação nativa recebida em primeiro plano:', notification);
        alert(`${notification.title}: ${notification.body}`);
      });

    } else {
      // Configuração WEB (Navegador)
      console.log("Plataforma web detectada. Configurando Firebase Web Push...");
      
      if (!("Notification" in window)) {
        console.log("Este navegador não suporta notificações desktop");
        isSettingUp = false;
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        console.log("Permissão de notificação web concedida.");
        
        let registration;
        if ('serviceWorker' in navigator) {
          try {
            const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
            if (existingReg) {
              registration = existingReg;
            } else {
              registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
              });
            }
            await navigator.serviceWorker.ready;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (swError) {
            console.error("Erro ao registrar Service Worker:", swError);
          }
        }
        
        const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
        
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log("Token FCM Web obtido:", token);
          
          const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

          if (error) throw error;
          
          onMessage(messaging, (payload) => {
            console.log('Mensagem web recebida em primeiro plano:', payload);
            if (payload.notification) {
              alert(`${payload.notification.title}: ${payload.notification.body}`);
            }
          });
        }
      } else {
        console.warn("Permissão de notificação web negada.");
      }
    }
  } catch (error) {
    console.error("Erro ao configurar notificações:", error);
    throw error;
  } finally {
    isSettingUp = false;
  }
};
