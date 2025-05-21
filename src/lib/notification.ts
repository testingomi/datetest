import { supabase } from './supabase';

// Check if Push API is supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Check if notification permission has been granted
export function hasNotificationPermission(): boolean {
  return areNotificationsSupported() && Notification.permission === 'granted';
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.warn('Notifications are not supported in this browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPushNotifications();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Convert a base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register service worker
async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

// Subscribe to push notifications
async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    if (!areNotificationsSupported()) {
      console.warn('Push notifications are not supported');
      return false;
    }

    const registration = await registerServiceWorker();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || '')
    });

    // Save subscription to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: JSON.stringify(subscription)
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

// Send a notification
export async function sendNotification(userId: string, title: string, body: string, url?: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions?.length) return;

    // Call edge function to send the notification
    const { error: sendError } = await supabase.functions.invoke('send-push', {
      body: {
        subscription: subscriptions[0].subscription,
        notification: {
          title,
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url }
        }
      }
    });

    if (sendError) throw sendError;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export { subscribeToPushNotifications }