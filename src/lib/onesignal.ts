import { supabase } from './supabase';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

export async function initializeOneSignal() {
  if (typeof window === 'undefined') return;

  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: {
          enable: true,
          size: 'medium',
          position: 'bottom-right',
          showCredit: false,
          prenotify: true,
          text: {
            'tip.state.unsubscribed': 'Subscribe to notifications',
            'tip.state.subscribed': "You're subscribed to notifications",
            'tip.state.blocked': "You've blocked notifications",
            'message.prenotify': 'Click to subscribe to notifications',
            'message.action.subscribed': "Thanks for subscribing!",
            'message.action.resubscribed': "You're subscribed to notifications",
            'message.action.unsubscribed': "You won't receive notifications again",
            'dialog.main.title': 'Manage Notifications',
            'dialog.main.button.subscribe': 'SUBSCRIBE',
            'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            'dialog.blocked.title': 'Unblock Notifications',
            'dialog.blocked.message': "Follow these instructions to allow notifications:"
          }
        },
        persistNotification: true,
        webhooks: {
          cors: true,
          'notification.displayed': 'https://flintxt.com/notification_displayed',
          'notification.clicked': 'https://flintxt.com/notification_clicked',
          'notification.dismissed': 'https://flintxt.com/notification_dismissed',
        },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: true,
                text: {
                  actionMessage: "Get notified about new matches and messages instantly!",
                  acceptButton: "Allow",
                  cancelButton: "No Thanks"
                }
              }
            ]
          }
        },
        welcomeNotification: {
          "title": "Welcome to Flintxt!",
          "message": "Thanks for subscribing to notifications",
          "url": "https://flintxt.com"
        },
        notificationClickHandlerMatch: "origin",
        notificationClickHandlerAction: "focus",
        serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
        serviceWorkerActivationPath: "/OneSignalSDKWorker.js",
      });

      // Set external user ID if we already have a user session
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          await OneSignal.login(data.session.user.id);
          console.log('OneSignal: User ID set during initialization:', data.session.user.id);
          
          // Set initial tags for segmentation
          await OneSignal.User.addTags({
            user_id: data.session.user.id,
            notifications_enabled: 'true',
            platform: 'web',
            app_version: '1.0.0'
          });
        }
      } catch (error) {
        console.error('Error setting user ID during initialization:', error);
      }
    });

  } catch (error) {
    console.error('Error initializing OneSignal:', error);
    throw error;
  }
}

export async function setExternalUserId(userId: string) {
  if (typeof window === 'undefined' || !userId) return;

  try {
    await window.OneSignalDeferred.push(async function(OneSignal) {
      // Log out any previous user first
      await OneSignal.logout();
      
      // Login the current user
      await OneSignal.login(userId);
      console.log('OneSignal: External user ID updated:', userId);
      
      // Add tags for better targeting
      await OneSignal.User.addTags({
        user_id: userId,
        notifications_enabled: 'true',
        last_login: new Date().toISOString(),
        platform: 'web',
        app_version: '1.0.0'
      });
    });
    return true;
  } catch (error) {
    console.error('Error setting external user ID:', error);
    return false;
  }
}

export async function subscribeToTopics(userId: string) {
  if (typeof window === 'undefined' || !userId) return;

  try {
    await window.OneSignalDeferred.push(async function(OneSignal) {
      // Subscribe to topics based on user ID
      await OneSignal.User.addTags({
        chats: 'enabled',
        matches: 'enabled',
        letters: 'enabled',
        user_id: userId,
        platform: 'web',
        app_version: '1.0.0'
      });
      console.log('OneSignal: Subscribed to notification topics');
    });
    return true;
  } catch (error) {
    console.error('Error subscribing to topics:', error);
    return false;
  }
}

export async function sendNotification(userId: string, title: string, message: string) {
  if (!userId || !title || !message) {
    console.error('Missing required parameters for notification');
    return null;
  }

  try {
    // Create a Supabase Edge Function to handle notification sending
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title,
        message,
        appId: ONESIGNAL_APP_ID,
        apiKey: ONESIGNAL_REST_API_KEY
      }
    });

    if (error) {
      console.error('Error from Edge Function:', error);
      throw error;
    }
    
    console.log('Notification sent successfully:', { userId, title });
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}