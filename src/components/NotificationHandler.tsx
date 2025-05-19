import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/notification';
import { supabase } from '../lib/supabase';
import { initializeOneSignal, setExternalUserId, subscribeToTopics, sendNotification } from '../lib/onesignal';

export default function NotificationHandler() {
  const { user } = useAuthStore();
  const { checkPermission } = useNotificationStore();
  const [oneSignalInitialized, setOneSignalInitialized] = useState(false);

  // Initialize OneSignal and set up user identification
  useEffect(() => {
    const setupOneSignal = async () => {
      try {
        // Initialize OneSignal
        await initializeOneSignal();
        setOneSignalInitialized(true);
        
        // Check browser permission status
        checkPermission();
        
        console.log('OneSignal initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OneSignal:', error);
      }
    };
    
    setupOneSignal();
  }, []);

  // Set external user ID when user state changes
  useEffect(() => {
    const setupUserIdentification = async () => {
      if (!user?.id || !oneSignalInitialized) return;
      
      try {
        // Set the external user ID for OneSignal
        await setExternalUserId(user.id);
        
        // Subscribe to notification topics
        await subscribeToTopics(user.id);
        
        console.log('User identification set up for notifications');
      } catch (error) {
        console.error('Error setting up user identification:', error);
      }
    };

    setupUserIdentification();
  }, [user?.id, oneSignalInitialized]);

  // Set up Supabase real-time listeners for notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time notification listeners for user:', user.id);

    // Set up Supabase real-time listeners
    const matchesChannel = supabase
      .channel('match-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_matches',
        filter: `user2_id=eq.${user.id}`,
      }, async (payload) => {
        console.log('Match notification event received:', payload);
        if (payload.new.status === 'pending_request') {
          try {
            await sendNotification(
              user.id,
              'New Match Request',
              'Someone has sent you a match request!'
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
        console.log('Message notification event received:', payload);
        if (payload.new.receiver_id === user.id) {
          try {
            const { data: sender } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', payload.new.sender_id)
              .single();

            await sendNotification(
              user.id,
              'New Message',
              sender ? `${sender.first_name} sent you a message` : 'You have a new message'
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
        console.log('Letter notification event received:', payload);
        try {
          const { data: sender } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', payload.new.sender_id)
            .single();

          await sendNotification(
            user.id,
            'New Letter',
            sender ? `${sender.first_name} sent you a letter` : 'Someone sent you a letter'
          );
        } catch (error) {
          console.error('Error sending letter notification:', error);
        }
      })
      .subscribe();

    // Fetch initial counts
    fetchUnreadCounts();

    return () => {
      console.log('Cleaning up notification channels');
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(lettersChannel);
    };
  }, [user?.id]);

  const fetchUnreadCounts = async () => {
    if (!user?.id) return;

    try {
      // Fetch unread match requests
      const { data: matchRequests, error: matchError } = await supabase
        .from('chat_matches')
        .select('id')
        .eq('user2_id', user.id)
        .eq('status', 'pending_request')
        .eq('viewed', false);

      if (!matchError) {
        useNotificationStore.getState().setUnreadMatches(matchRequests?.length || 0);
      }

      // Fetch unread letters
      const { data: letters, error: lettersError } = await supabase
        .from('letters')
        .select('id')
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (!lettersError) {
        useNotificationStore.getState().setUnreadLetters(letters?.length || 0);
      }

      // Fetch unread messages (this would require a more complex query
      // or a separate table to track read status per user per message)
      // For now, we'll leave it at 0
      useNotificationStore.getState().setUnreadMessages(0);

    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  return null;
}