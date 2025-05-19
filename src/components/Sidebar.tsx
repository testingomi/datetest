import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  MessageSquare,
  Mail, 
  LogOut,
  Settings,
  Heart,
  Bell,
  UserCircle,
  Coffee,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';
import NotificationBadge from './NotificationBadge';
import { useNotificationStore } from '../store/notification';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuthStore();
  const { unreadMatches, unreadLetters, unreadMessages } = useNotificationStore();

  const navigation = [
    { name: 'Profile', href: '/profile', icon: UserCircle, badge: null },
    { name: 'Find Match', href: '/swipe', icon: Heart, badge: null },
    { name: 'Chats', href: '/chat', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null },
    { name: 'Match Requests', href: '/match-requests', icon: Bell, badge: unreadMatches > 0 ? unreadMatches : null },
    { name: 'Letters', href: '/letters', icon: Mail, badge: unreadLetters > 0 ? unreadLetters : null },
    { name: 'How to Use', href: '/how-to-use', icon: Coffee, badge: null },
    { name: 'Report User', href: '/report', icon: AlertCircle, badge: null },
    { name: 'Contact Us', href: '/contact', icon: Mail, badge: null },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-full flex flex-col bg-white/95 backdrop-blur-md shadow-soft hover:shadow-lg transition-all duration-300">
      {/* Logo Header */}
      <div className="p-6 border-b border-purple-100">
        <Link 
          to="/" 
          className="flex items-center gap-3 group"
          onClick={onClose}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
            <Heart className="w-6 h-6 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            flintxt
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group relative',
                isActive(item.href)
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform hover:scale-[1.02]'
                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 mr-3 transition-transform duration-300',
                isActive(item.href) ? 'animate-pulse' : 'group-hover:scale-110'
              )} />
              <span className="font-medium">{item.name}</span>
              
              {item.badge && (
                <NotificationBadge 
                  count={item.badge} 
                  className="ml-auto"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-purple-100">
        <button
          onClick={() => {
            signOut();
            onClose?.();
          }}
          className="w-full p-3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 group shadow-lg hover:shadow-xl"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}