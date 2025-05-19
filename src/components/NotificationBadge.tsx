import React from 'react';
import { useNotificationStore } from '../store/notification';
import { cn } from '../lib/utils';

interface NotificationBadgeProps {
  count?: number;
  type?: 'chat' | 'match' | 'letter' | 'all';
  className?: string;
}

export default function NotificationBadge({ 
  count, 
  type = 'all', 
  className 
}: NotificationBadgeProps) {
  const { 
    unreadMatches, 
    unreadMessages, 
    unreadLetters, 
    totalUnread 
  } = useNotificationStore();
  
  // Determine which count to use
  let displayCount = count;
  
  if (displayCount === undefined) {
    switch(type) {
      case 'chat':
        displayCount = unreadMessages;
        break;
      case 'match':
        displayCount = unreadMatches;
        break;
      case 'letter':
        displayCount = unreadLetters;
        break;
      case 'all':
        displayCount = totalUnread;
        break;
    }
  }
  
  if (!displayCount || displayCount <= 0) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "min-w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold px-1.5",
        className
      )}
    >
      {displayCount > 99 ? '99+' : displayCount}
    </div>
  );
}