import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  appId: string;
  apiKey: string;
}

serve(async (req) => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, title, message, appId, apiKey } = await req.json() as NotificationRequest;

    if (!userId || !title || !message || !appId || !apiKey) {
      throw new Error('Missing required parameters');
    }

    console.log(`Sending notification to user ${userId}: ${title}`);

    // Enhanced notification payload with more options
    const notificationPayload = {
      app_id: appId,
      include_external_user_ids: [userId],
      contents: { en: message },
      headings: { en: title },
      channel_for_external_user_ids: 'push',
      // Target users across all platforms
      isAnyWeb: true,
      isIos: true,
      isAndroid: true,
      // Specify web action
      web_push_topic: 'flintxt-notification',
      // Add extra options for better delivery
      priority: 10,
      ttl: 259200, // 3 days in seconds
      // Add filters to ensure the user gets the notification
      filters: [
        {"field": "tag", "key": "user_id", "relation": "=", "value": userId}
      ],
      // Web push specific settings
      web_buttons: [
        {id: "open", text: "Open App"}
      ],
      // Additional settings for better delivery
      chrome_web_icon: "https://flintxt.com/favicon.ico",
      chrome_web_badge: "https://flintxt.com/favicon.ico",
      firefox_icon: "https://flintxt.com/favicon.ico",
      chrome_web_image: "https://flintxt.com/preview.jpeg",
      url: "https://flintxt.com",
      // Sound and vibration
      android_sound: "notification",
      android_visibility: 1,
      android_channel_id: "flintxt-notifications",
      android_group: "flintxt",
      ios_sound: "notification.wav",
      // Ensure immediate delivery
      delayed_option: "immediate",
      delivery_time_of_day: "",
      throttle_rate_per_minute: 0
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', responseData);
      throw new Error(`Failed to send notification: ${JSON.stringify(responseData)}`);
    }

    console.log('Notification sent successfully:', responseData);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: responseData,
      message: 'Notification sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      message: 'Failed to send notification' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});