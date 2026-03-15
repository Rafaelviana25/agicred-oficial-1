import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Contract, Client } from '../types';

export const setupLocalNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display === 'prompt' || permStatus.display === 'denied') {
        permStatus = await LocalNotifications.requestPermissions();
      }
      
      if (permStatus.display !== 'granted') {
        console.warn("Permissão de notificação local não concedida.");
      }

      // On Android, we might need to check for exact alarm permission
      // but Capacitor doesn't expose this directly. 
      // Requesting permissions again with specific types can help.
      await LocalNotifications.requestPermissions();
    } catch (e) {
      console.error("Erro ao configurar permissões de notificação:", e);
    }
  }
};

export const scheduleContractNotifications = async (contracts: Contract[], clients: Client[], proExpiresAt?: string | null) => {
  if (!Capacitor.isNativePlatform()) return;

  const isEnabled = localStorage.getItem('local_notifications_enabled') === 'true';
  
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }
  if (!isEnabled) return;

  const now = new Date();
  const notificationsToSchedule: any[] = [];
  let idCounter = 1;

  const timeStr = localStorage.getItem('notif_time') || '09:00';
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    hours = 9;
    minutes = 0;
  }

  // Use a stable base time for all calculations in this pass
  const baseDate = new Date(now);
  console.log(`Agendando notificações para as ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (Base: ${baseDate.toISOString()})`);

  const hasSound = localStorage.getItem('notif_sound') !== 'false';
  const hasVib = localStorage.getItem('notif_vib') !== 'false';

  let channelId = 'agicred_alerts';
  if (Capacitor.getPlatform() === 'android') {
    channelId = `agicred_alerts_${hasSound ? 's' : 'ns'}_${hasVib ? 'v' : 'nv'}`;
    try {
      await LocalNotifications.createChannel({
        id: channelId,
        name: 'Alertas Agicred',
        description: 'Notificações de vencimento',
        importance: 5,
        vibration: hasVib,
        visibility: 1,
        sound: hasSound ? 'default' : undefined
      });
    } catch (e) {
      console.error("Erro ao criar canal de notificação:", e);
    }
  }

  // PRO Expiry Notification
  if (proExpiresAt) {
    const expiryDate = new Date(proExpiresAt);
    const oneDayBefore = new Date(expiryDate);
    oneDayBefore.setDate(expiryDate.getDate() - 1);
    oneDayBefore.setHours(hours, minutes, 0, 0);

    if (oneDayBefore.getTime() > baseDate.getTime()) {
      notificationsToSchedule.push({
        title: 'Renovação de Plano',
        body: 'ATENÇÃO! Falta 1 dia para finalizar seu plano PRO, Faça a renovação',
        id: 5000,
        channelId: channelId,
        schedule: { 
          at: oneDayBefore,
          allowWhileIdle: true
        },
        sound: hasSound ? 'default' : undefined,
      });
    }
  }

  contracts.forEach(c => {
    if (c.status === 'paid') return;
    
    const monthlyValue = Number(c.monthly_interest) || 0;
    if (monthlyValue <= 0) return;

    const totalPaid = Number(c.paid_amount || 0);
    // Use integer math (cents) to avoid floating point errors
    const installmentsFullyPaid = Math.floor(Math.round(totalPaid * 100) / Math.round(monthlyValue * 100));
    
    if (installmentsFullyPaid >= c.months) return;

    const firstDueDate = new Date(c.end_date + 'T12:00:00');
    if (c.months > 1) {
      firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
    }

    // Next unpaid installment due date
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + installmentsFullyPaid);
    
    const client = clients.find(cl => cl.id === c.client_id);
    const clientName = client ? client.full_name : 'Cliente';

    // Calculate the notification time for today
    const todayNotifTime = new Date(baseDate);
    todayNotifTime.setHours(hours, minutes, 0, 0);

    // If the contract is due today or already overdue
    const isDueToday = dueDate.toDateString() === baseDate.toDateString();
    const isOverdue = dueDate.getTime() < baseDate.getTime() && !isDueToday;

    if (isDueToday || isOverdue) {
      if (isOverdue) {
        // For overdue contracts, schedule a REPEATING notification so it reminds every day
        // until the user opens the app and it gets rescheduled (or contract is paid)
        let exactTime = new Date(todayNotifTime.getTime());
        if (exactTime.getTime() <= baseDate.getTime()) {
          exactTime.setDate(exactTime.getDate() + 1);
        }
        notificationsToSchedule.push({
          title: 'Contrato Vencido!',
          body: `O contrato de ${clientName} está vencido.`,
          id: 1000 + idCounter++,
          channelId: channelId,
          schedule: { 
            at: exactTime,
            every: 'day',
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
          extra: { isOverdue: true }
        });
      } else if (todayNotifTime.getTime() > baseDate.getTime()) {
        // Due today and time is in the future
        const exactTime = new Date(todayNotifTime.getTime());
        
        notificationsToSchedule.push({
          title: 'Vencimento Hoje',
          body: `O contrato de ${clientName} vence hoje.`,
          id: 1000 + idCounter++,
          channelId: channelId,
          schedule: { 
            at: exactTime,
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
          extra: { isOverdue: false }
        });
      } else {
        // Due today but time already passed, schedule for tomorrow as "Overdue"
        let exactTime = new Date(todayNotifTime.getTime());
        exactTime.setDate(exactTime.getDate() + 1);
        notificationsToSchedule.push({
          title: 'Contrato Vencido!',
          body: `O contrato de ${clientName} está vencido.`,
          id: 1000 + idCounter++,
          channelId: channelId,
          schedule: { 
            at: exactTime,
            every: 'day',
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
          extra: { isOverdue: true }
        });
      }
    } else {
      // Future due date (not today, not overdue)
      const futureNotifTime = new Date(dueDate);
      futureNotifTime.setHours(hours, minutes, 0, 0);

      // Only schedule if it's within a reasonable window (e.g., next 30 days) to avoid hitting limits
      const thirtyDaysFromNow = new Date(baseDate);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (futureNotifTime.getTime() > baseDate.getTime() && futureNotifTime.getTime() < thirtyDaysFromNow.getTime()) {
        const exactTime = new Date(futureNotifTime.getTime());

        notificationsToSchedule.push({
          title: 'Vencimento em Breve',
          body: `O contrato de ${clientName} vence em breve.`,
          id: 1000 + idCounter++,
          channelId: channelId,
          schedule: { 
            at: exactTime,
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
        });
      }
    }
  });

  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        console.warn("Sem permissão para agendar notificações.");
        return;
      }

      if (notificationsToSchedule.length > 0) {
        console.log(`Agendando ${notificationsToSchedule.length} notificações no dispositivo:`, notificationsToSchedule);
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      } else {
        console.log("Nenhuma notificação para agendar (sem contratos vencendo hoje ou atrasados).");
      }
    } catch (e) {
      console.error("Erro ao agendar notificações locais:", e);
    }
  }
};

export const sendTestNotification = async () => {
  const now = new Date();
  const testTime = new Date(now.getTime() + 5000); // 5 seconds from now
  
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Teste de Notificação',
            body: 'Se você está vendo isso, as notificações estão funcionando!',
            id: 999,
            schedule: { at: testTime, allowWhileIdle: true }
          }
        ]
      });
      alert("Notificação de teste agendada para daqui a 5 segundos.");
    } catch (e) {
      console.error("Erro no teste de notificação:", e);
      alert("Erro ao enviar notificação de teste.");
    }
  }
};
