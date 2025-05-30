import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/notification';
import { supabase } from '../lib/supabase';
import { areNotificationsSupported, hasNotificationPermission, requestNotificationPermission, subscribeToPushNotifications, sendNotification } from '../lib/notification';

export default function NotificationHandler() {
  const { user } = useAuthStore();
  const { 
    checkPermission, 
    incrementUnreadMatches,
    incrementUnreadMessages,
    incrementUnreadLetters,
    incrementChatNotifications
  } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    // Set up real-time listeners for notifications
    const matchesChannel = supabase
      .channel('match-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_matches',
        filter: `user2_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.status === 'pending_request') {
          incrementUnreadMatches();
          try {
            const { data: sender } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', payload.new.user1_id)
              .single();

            await sendNotification(
              user.id,
              'New Match Request',
              sender ? `${sender.first_name} wants to connect with you!` : 'Someone wants to connect with you!',
              '/match-requests',
              {
                tag: 'match_request',
                requireInteraction: true,
                renotify: true,
                silent: false
              }
            );
          } catch (error) {
            console.error('Error sending match notification:', error);
          }
        }
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('message-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, async (payload) => {
        if (payload.new.receiver_id === user.id) {
          incrementUnreadMessages();
          incrementChatNotifications(payload.new.match_id);
          
          try {
            const { data: sender } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', payload.new.sender_id)
              .single();

            await sendNotification(
              user.id,
              'New Message',
              sender ? `${sender.first_name} sent you a message` : 'You have a new message',
              '/chat',
              {
                tag: `chat_${payload.new.match_id}`,
                requireInteraction: false,
                renotify: true,
                silent: false
              }
            );
          } catch (error) {
            console.error('Error sending message notification:', error);
          }
        }
      })
      .subscribe();

    const lettersChannel = supabase
      .channel('letter-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'letters',
        filter: `recipient_id=eq.${user.id}`,
      }, async (payload) => {
        incrementUnreadLetters();
        try {
          const { data: sender } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', payload.new.sender_id)
            .single();

          await sendNotification(
            user.id,
            'New Letter',
            sender ? `${sender.first_name} sent you a letter` : 'Someone sent you a letter',
            '/letters',
            {
              tag: 'letter',
              requireInteraction: true,
              renotify: true,
              silent: false
            }
          );
        } catch (error) {
          console.error('Error sending letter notification:', error);
        }
      })
      .subscribe();

    // Check if push notifications are supported and request permission
    if (areNotificationsSupported()) {
      subscribeToPushNotifications();
    }

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(lettersChannel);
    };
  }, [user]);

  return null;
}