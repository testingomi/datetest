import { create } from 'zustand';
import { 
  areNotificationsSupported, 
  hasNotificationPermission,
  requestNotificationPermission
} from '../lib/notification';

interface NotificationState {
  permissionStatus: NotificationPermission | 'unsupported';
  isPermissionAsked: boolean;
  unreadMatches: number;
  unreadMessages: number;
  unreadLetters: number;
  totalUnread: number;
  chatNotifications: Record<string, number>;

  // Functions to check and update permissions
  checkPermission: () => void;
  requestPermission: () => Promise<boolean>;
  
  // Functions to update unread counts
  setUnreadMatches: (count: number) => void;
  setUnreadMessages: (count: number) => void;
  setUnreadLetters: (count: number) => void;
  resetUnreadMatches: () => void;
  resetUnreadMessages: () => void;
  resetUnreadLetters: () => void;
  incrementUnreadMatches: (amount?: number) => void;
  incrementUnreadMessages: (amount?: number) => void;
  incrementUnreadLetters: (amount?: number) => void;
  
  // Chat-specific notification functions
  setChatNotifications: (chatId: string, count: number) => void;
  incrementChatNotifications: (chatId: string) => void;
  resetChatNotifications: (chatId: string) => void;
  resetAllChatNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  permissionStatus: areNotificationsSupported() 
    ? (Notification.permission as NotificationPermission) 
    : 'unsupported',
  isPermissionAsked: false,
  unreadMatches: 0,
  unreadMessages: 0,
  unreadLetters: 0,
  totalUnread: 0,
  chatNotifications: {},
  
  // Check current notification permission
  checkPermission: () => {
    const status = areNotificationsSupported()
      ? Notification.permission
      : 'unsupported';
    
    set({ permissionStatus: status });
  },
  
  // Request notification permission
  requestPermission: async () => {
    const isGranted = await requestNotificationPermission();
    set({
      permissionStatus: isGranted ? 'granted' : 'denied',
      isPermissionAsked: true
    });
    return isGranted;
  },

  // Set unread matches count
  setUnreadMatches: (count) => {
    set(state => ({
      unreadMatches: count,
      totalUnread: count + state.unreadMessages + state.unreadLetters
    }));
  },
  
  // Set unread messages count
  setUnreadMessages: (count) => {
    set(state => ({
      unreadMessages: count,
      totalUnread: state.unreadMatches + count + state.unreadLetters
    }));
  },
  
  // Set unread letters count
  setUnreadLetters: (count) => {
    set(state => ({
      unreadLetters: count,
      totalUnread: state.unreadMatches + state.unreadMessages + count
    }));
  },
  
  // Reset unread matches
  resetUnreadMatches: () => {
    set(state => ({
      unreadMatches: 0,
      totalUnread: state.unreadMessages + state.unreadLetters
    }));
  },
  
  // Reset unread messages
  resetUnreadMessages: () => {
    set(state => ({
      unreadMessages: 0,
      totalUnread: state.unreadMatches + state.unreadLetters
    }));
  },
  
  // Reset unread letters
  resetUnreadLetters: () => {
    set(state => ({
      unreadLetters: 0,
      totalUnread: state.unreadMatches + state.unreadMessages
    }));
  },
  
  // Increment unread matches
  incrementUnreadMatches: (amount = 1) => {
    set(state => ({
      unreadMatches: state.unreadMatches + amount,
      totalUnread: state.unreadMatches + amount + state.unreadMessages + state.unreadLetters
    }));
  },
  
  // Increment unread messages
  incrementUnreadMessages: (amount = 1) => {
    set(state => ({
      unreadMessages: state.unreadMessages + amount,
      totalUnread: state.unreadMatches + state.unreadMessages + amount + state.unreadLetters
    }));
  },
  
  // Increment unread letters
  incrementUnreadLetters: (amount = 1) => {
    set(state => ({
      unreadLetters: state.unreadLetters + amount,
      totalUnread: state.unreadMatches + state.unreadMessages + state.unreadLetters + amount
    }));
  },

  // Chat-specific notification functions
  setChatNotifications: (chatId, count) => {
    set(state => {
      const newChatNotifications = {
        ...state.chatNotifications,
        [chatId]: count
      };
      
      // Calculate total unread messages
      const totalMessages = Object.values(newChatNotifications).reduce((sum, count) => sum + count, 0);
      
      return {
        chatNotifications: newChatNotifications,
        unreadMessages: totalMessages,
        totalUnread: state.unreadMatches + totalMessages + state.unreadLetters
      };
    });
  },

  incrementChatNotifications: (chatId) => {
    set(state => {
      const currentCount = state.chatNotifications[chatId] || 0;
      const newChatNotifications = {
        ...state.chatNotifications,
        [chatId]: currentCount + 1
      };
      
      const totalMessages = Object.values(newChatNotifications).reduce((sum, count) => sum + count, 0);
      
      return {
        chatNotifications: newChatNotifications,
        unreadMessages: totalMessages,
        totalUnread: state.unreadMatches + totalMessages + state.unreadLetters
      };
    });
  },

  resetChatNotifications: (chatId) => {
    set(state => {
      const newChatNotifications = { ...state.chatNotifications };
      delete newChatNotifications[chatId];
      
      const totalMessages = Object.values(newChatNotifications).reduce((sum, count) => sum + count, 0);
      
      return {
        chatNotifications: newChatNotifications,
        unreadMessages: totalMessages,
        totalUnread: state.unreadMatches + totalMessages + state.unreadLetters
      };
    });
  },

  resetAllChatNotifications: () => {
    set(state => ({
      chatNotifications: {},
      unreadMessages: 0,
      totalUnread: state.unreadMatches + state.unreadLetters
    }));
  }
}));