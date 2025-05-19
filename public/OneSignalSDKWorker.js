importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received:', event);
  
  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = event.data.json();
      console.log('Push notification data:', notificationData);
    }
  } catch (e) {
    console.error('Error parsing push notification data:', e);
  }
  
  const title = notificationData.title || 'Flintxt Notification';
  const body = notificationData.body || event.data ? event.data.text() : 'You have a new notification';
  
  const options = {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: notificationData.url || '/',
      timestamp: new Date().getTime()
    },
    requireInteraction: true,
    vibrate: [200, 100, 200],
    tag: 'flintxt-notification-' + new Date().getTime(),
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ],
    silent: false,
    sound: 'default'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed', event);
});
