import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { areNotificationsSupported, requestNotificationPermission } from '../lib/notification';
import { useNotificationStore } from '../store/notification';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { permissionStatus, isPermissionAsked, checkPermission } = useNotificationStore();

  useEffect(() => {
    // Only show prompt if notifications are supported and not already granted/denied
    if (areNotificationsSupported() && permissionStatus === 'default' && !isPermissionAsked) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [permissionStatus, isPermissionAsked]);

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      checkPermission(); // Update permission status in store
      setShowPrompt(false);
      
      if (granted) {
        // Show a test notification
        new Notification('Notifications Enabled!', {
          body: 'You will now receive notifications for new matches and messages.',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Failed to enable notifications. Please check your browser settings and try again.');
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-slide-up">
      <div className="bg-white px-4 py-5 rounded-xl shadow-xl border border-purple-100">
        <div className="flex items-start gap-3">
          <div className="bg-purple-100 p-2 rounded-full">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-3">
              Get notified about new matches, messages, and letters in real time, even when you're not using the app.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-700 transition-colors"
              >
                <Bell className="w-3 h-3" />
                Enable Notifications
              </button>
              
              <button
                onClick={() => setShowPrompt(false)}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}