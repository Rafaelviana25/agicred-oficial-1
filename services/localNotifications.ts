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

export const scheduleContractNotifications = async (contracts: Contract[], clients: Client[]) => {
  const now = new Date();
  const notificationsToSchedule: any[] = [];
  let idCounter = 1;

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

    // Schedule for the next unpaid installment
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + installmentsFullyPaid);
    dueDate.setHours(9, 0, 0, 0); // 9 AM

    const client = clients.find(cl => cl.id === c.client_id);
    const clientName = client ? client.full_name : 'Cliente';

    // If due date is in the future, schedule it
    if (dueDate.getTime() > now.getTime()) {
      notificationsToSchedule.push({
        title: 'Vencimento de Contrato',
        body: `O contrato de ${clientName} vence hoje.`,
        id: idCounter++,
        schedule: { at: dueDate },
        sound: 'default',
      });
    } else {
      // If it's already overdue, schedule for tomorrow at 9 AM to remind them
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      notificationsToSchedule.push({
        title: 'Contrato Atrasado!',
        body: `O contrato de ${clientName} está atrasado.`,
        id: idCounter++,
        schedule: { at: tomorrow },
        sound: 'default',
        isOverdue: true, // Custom flag for web
      });
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
    }
  }
};
