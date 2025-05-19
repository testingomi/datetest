import { supabase } from './supabase';
import { useAuthStore } from '../store/auth';

// Function to check if notifications are supported
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

// Function to check if notification permission has been granted
export function hasNotificationPermission(): boolean {
  return areNotificationsSupported() && Notification.permission === 'granted';
}

// Function to request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.warn('Notifications are not supported in this browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Initialize OneSignal after permission is granted
      await initializeOneSignal();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Function to send a browser notification (fallback for when OneSignal isn't available)
export function sendLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!hasNotificationPermission()) {
    console.warn('Notification permission not granted');
    return null;
  }

  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    requireInteraction: true,
    ...options,
  });

  // Add click handler to focus the window and navigate if needed
  notification.onclick = function() {
    window.focus();
    if (options?.data?.url) {
      window.location.href = options.data.url;
    }
    notification.close();
  };

  return notification;
}

// Import and re-export OneSignal initialization for consistency
import { initializeOneSignal } from './onesignal';
export { initializeOneSignal };

// Setup real-time notification listeners
type Unsubscribe = () => void;

export function setupNotificationListeners(userId: string): Unsubscribe {
  if (!userId) return () => {};

  // Set up real-time listeners for new match requests
  const matchesChannel = supabase
    .channel('match-requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_matches',
        filter: `user2_id=eq.${userId}`,
      },
      (payload) => {
        if (
          payload.new.status === 'pending_request' &&
          !payload.new.viewed &&
          hasNotificationPermission()
        ) {
          // Send a local notification as a fallback
          sendLocalNotification('New Match Request', {
            body: 'Someone has sent you a match request!',
            data: { url: '/match-requests' },
          });
        }
      }
    )
    .subscribe();

  // Set up real-time listeners for new messages
  const messagesChannel = supabase
    .channel('chat-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      async (payload) => {
        const matchId = payload.new.match_id;
        // Only notify if sender is not the current user
        if (payload.new.sender_id !== userId) {
          try {
            // Get match details to check if user is part of it
            const { data: match, error } = await supabase
              .from('chat_matches')
              .select('*')
              .eq('id', matchId)
              .single();

            if (error) throw error;
            
            if (
              (match.user1_id === userId || match.user2_id === userId) &&
              hasNotificationPermission()
            ) {
              // Get sender's name
              const { data: sender } = await supabase
                .from('profiles')
                .select('first_name')
                .eq('id', payload.new.sender_id)
                .single();

              // Send a local notification as a fallback
              sendLocalNotification(
                'New Message',
                {
                  body: sender ? `${sender.first_name} sent you a message` : 'You have a new message',
                  data: { url: '/chat' },
                }
              );
            }
          } catch (error) {
            console.error('Error checking match details:', error);
          }
        }
      }
    )
    .subscribe();

  // Set up real-time listeners for new letters
  const lettersChannel = supabase
    .channel('letters')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'letters',
        filter: `recipient_id=eq.${userId}`,
      },
      async (payload) => {
        if (hasNotificationPermission()) {
          try {
            // Get sender's name
            const { data: sender } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', payload.new.sender_id)
              .single();

            // Send a local notification as a fallback
            sendLocalNotification(
              'New Letter',
              {
                body: sender ? `${sender.first_name} sent you a letter` : 'Someone sent you a letter',
                data: { url: '/letters' },
              }
            );
          } catch (error) {
            console.error('Error fetching sender details:', error);
            sendLocalNotification('New Letter', {
              body: 'Someone sent you a letter',
              data: { url: '/letters' },
            });
          }
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(matchesChannel);
    supabase.removeChannel(messagesChannel);
    supabase.removeChannel(lettersChannel);
  };
}