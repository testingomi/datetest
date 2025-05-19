import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Retry configuration
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
};

// Custom fetch with retry logic
const fetchWithRetry = async (url: string, options: RequestInit) => {
  let lastError;
  
  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry on 400 errors as they indicate invalid requests
      if (response.status === 400) {
        throw new Error('Invalid request - token may be expired');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (error.message.includes('token may be expired')) {
        // Clear invalid session data
        localStorage.removeItem('supabase.auth.token');
        window.location.href = '/login';
        break;
      }
      
      if (attempt < retryConfig.maxRetries - 1) {
        const delay = Math.min(
          retryConfig.retryDelay * Math.pow(2, attempt),
          retryConfig.maxDelay
        );
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'x-application-name': 'dating-app',
    },
    fetch: fetchWithRetry,
  },
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear local storage
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('onboardingFormData');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  }
});