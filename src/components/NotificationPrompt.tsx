import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Info } from 'lucide-react';
import { 
  areNotificationsSupported, 
  requestNotificationPermission 
} from '../lib/notification';
import { useNotificationStore } from '../store/notification';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { permissionStatus, isPermissionAsked, checkPermission, requestPermission } = useNotificationStore();

  useEffect(() => {
    // Check if notifications are supported and not yet granted
    if (
      areNotificationsSupported() && 
      permissionStatus !== 'granted' && 
      !isPermissionAsked
    ) {
      // Wait a bit before showing the prompt to not overwhelm the user right away
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [permissionStatus, isPermissionAsked]);

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        // If permission is granted, try to verify OneSignal is working
        console.log('Push notification permission granted');
        
        // Explicitly log to console that we're setting up OneSignal
        console.log('Setting up OneSignal after permission granted');
        
        // Check if OneSignal is available
        if (window.OneSignal) {
          console.log('OneSignal is available in global scope');
          
          // Force a re-registration with OneSignal
          await window.OneSignalDeferred.push(async (OneSignal) => {
            try {
              const pushId = await OneSignal.getUserId();
              console.log('OneSignal user ID:', pushId);
              
              if (!pushId) {
                console.log('No OneSignal user ID, attempting to register');
                await OneSignal.registerForPushNotifications();
              }
            } catch (error) {
              console.error('Error registering with OneSignal:', error);
            }
          });
        }
      }
      setShowPrompt(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

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
                onClick={handleDismiss}
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