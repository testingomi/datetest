import { supabase } from './supabase';

// Check if Push API is supported
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
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
    // First request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Show welcome notification
      new Notification('Notifications Enabled!', {
        body: 'You will now receive notifications for new matches and messages.',
        icon: '/favicon.ico',
        tag: 'welcome',
        requireInteraction: false,
        silent: false
      });
      
      // Only try to subscribe to push if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await registerServiceWorker();
        await subscribeToPushNotifications();
      }
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
    .replace(/-/g, '+')
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
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker API not supported');
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    console.log('Service Worker registered successfully');

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check if push is supported
    if (!areNotificationsSupported()) {
      console.warn('Push notifications are not supported');
      return false;
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('User must be authenticated to subscribe to push notifications');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Unsubscribe from any existing subscriptions
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || '')
    });

    // Save subscription to database
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
export async function sendNotification(
  userId: string, 
  title: string, 
  body: string, 
  url: string,
  options: { 
    tag?: string;
    requireInteraction?: boolean;
    renotify?: boolean;
    silent?: boolean;
  } = {}
) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions || !subscriptions.length) return;

    const notificationData = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url },
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction ?? true,
      renotify: options.renotify ?? true,
      silent: options.silent ?? false,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/favicon.ico'
        }
      ]
    };

    const { error: sendError } = await supabase.functions.invoke('send-push', {
      body: {
        subscription: subscriptions[0].subscription,
        notification: notificationData
      }
    });

    if (sendError) throw sendError;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}