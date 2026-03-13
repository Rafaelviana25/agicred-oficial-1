import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Contract, Client } from '../types';

export const setupLocalNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'prompt') {
      permStatus = await LocalNotifications.requestPermissions();
    }
    if (permStatus.display !== 'granted') {
      console.warn("Permissão de notificação local negada.");
    }
  } else {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }
  }
};

// Store timeouts to clear them if rescheduled
let webNotificationTimeouts: any[] = [];

export const scheduleContractNotifications = async (contracts: Contract[], clients: Client[]) => {
  const now = new Date();
  const notificationsToSchedule: any[] = [];
  let idCounter = 1;

  const timeStr = localStorage.getItem('notif_time') || '09:00';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const hasSound = localStorage.getItem('notif_sound') !== 'false';
  const hasVib = localStorage.getItem('notif_vib') !== 'false';

  let channelId = 'default';
  if (Capacitor.getPlatform() === 'android') {
    channelId = `agicred_alerts_${hasSound ? 's' : 'ns'}_${hasVib ? 'v' : 'nv'}`;
    await LocalNotifications.createChannel({
      id: channelId,
      name: 'Alertas Agicred',
      description: 'Notificações de vencimento',
      importance: 5,
      vibration: hasVib,
      visibility: 1,
      sound: hasSound ? 'default' : undefined
    });
  }

  contracts.forEach(c => {
    if (c.status === 'paid') return;
    
    const monthlyValue = Number(c.monthly_interest) || 0;
    if (monthlyValue <= 0) return;

    const totalPaid = Number(c.paid_amount || 0);
    const installmentsFullyPaid = Math.floor(totalPaid / monthlyValue);
    
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
    const todayNotifTime = new Date();
    todayNotifTime.setHours(hours, minutes, 0, 0);

    // If the contract is due today or already overdue
    const isDueToday = dueDate.toDateString() === now.toDateString();
    const isOverdue = dueDate.getTime() < now.getTime() && !isDueToday;

    if (isDueToday || isOverdue) {
      if (todayNotifTime.getTime() > now.getTime()) {
        // Schedule for today
        notificationsToSchedule.push({
          title: isDueToday ? 'Vencimento Hoje' : 'Contrato Vencido!',
          body: isDueToday ? `O contrato de ${clientName} vence hoje.` : `O contrato de ${clientName} está vencido.`,
          id: idCounter++,
          channelId: channelId,
          schedule: { 
            at: todayNotifTime,
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
          isOverdue: isOverdue
        });
      } else {
        // Notification time for today passed, schedule for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hours, minutes, 0, 0);
        
        notificationsToSchedule.push({
          title: 'Contrato Vencido!',
          body: `O contrato de ${clientName} está vencido.`,
          id: idCounter++,
          channelId: channelId,
          schedule: { 
            at: tomorrow,
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
          isOverdue: true
        });
      }
    } else {
      // Future due date (not today, not overdue)
      const futureNotifTime = new Date(dueDate);
      futureNotifTime.setHours(hours, minutes, 0, 0);

      // Only schedule if it's within a reasonable window (e.g., next 30 days) to avoid hitting limits
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (futureNotifTime.getTime() > now.getTime() && futureNotifTime.getTime() < thirtyDaysFromNow.getTime()) {
        notificationsToSchedule.push({
          title: 'Vencimento em Breve',
          body: `O contrato de ${clientName} vence em breve.`,
          id: idCounter++,
          channelId: channelId,
          schedule: { 
            at: futureNotifTime,
            allowWhileIdle: true
          },
          sound: hasSound ? 'default' : undefined,
        });
      }
    }
  });

  if (Capacitor.isNativePlatform()) {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') return;

    // Cancel previous notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } else {
    // Web notifications
    if ("Notification" in window && Notification.permission === "granted") {
      // Clear previous timeouts
      webNotificationTimeouts.forEach(t => clearTimeout(t));
      webNotificationTimeouts = [];

      // For web, we can't easily schedule for the future without a service worker.
      // So we just show notifications for contracts that are currently overdue.
      const overdueNotifications = notificationsToSchedule.filter(n => n.isOverdue);
      
      // We don't want to spam the user, so maybe just show one summary notification
      if (overdueNotifications.length > 0) {
        // Check if we already showed it today using localStorage
        const lastShown = localStorage.getItem('lastOverdueNotificationDate');
        const todayStr = new Date().toDateString();
        
        if (lastShown !== todayStr) {
          new Notification('Contratos Atrasados!', {
            body: `Você tem ${overdueNotifications.length} contrato(s) com parcelas em atraso.`,
            icon: '/vite.svg' // Optional icon
          });
          localStorage.setItem('lastOverdueNotificationDate', todayStr);
        }
      }

      // NEW: Support for "scheduling" in the current session for testing
      // If there are notifications scheduled for TODAY but in the FUTURE, 
      // we can set a timeout to show them if the app stays open.
      notificationsToSchedule.forEach(n => {
        if (!n.isOverdue && n.schedule?.at) {
          const scheduledTime = n.schedule.at.getTime();
          const delay = scheduledTime - Date.now();
          
          if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Only if it's within the next 24 hours
            const timeoutId = setTimeout(() => {
              if (Notification.permission === "granted") {
                new Notification(n.title, {
                  body: n.body,
                  icon: '/vite.svg'
                });
              }
            }, delay);
            webNotificationTimeouts.push(timeoutId);
          }
        }
      });
    }
  }
};
