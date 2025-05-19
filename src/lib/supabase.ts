
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Retry configuration
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Custom fetch with retry logic
const fetchWithRetry = async (url: string, options: RequestInit) => {
  let lastError;
  
  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      if (attempt < retryConfig.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
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
  }
});
