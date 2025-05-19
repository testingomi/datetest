import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  loading: boolean;
  setUser: (user: any | null) => void;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  signUp: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (data.user) {
        // Phone number update removed
      }

      if (error) throw error;
      
      // Only send verification email through initial signup
      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error };
    }
  },
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if profile exists and is complete
      if (data.user) {
        try {
          // Check if profile exists directly
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          // If no profile found or error, create an empty one
          if (!profile || profileError) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({ 
                id: data.user.id,
                first_name: '',
                age: 18,
                city: '',
                state: '',
                occupation: '',
                gender: '',
                bio: '',
                tagline: '',
                looking_for: [],
                mental_tags: [],
                text_style: '',
                love_language: '',
                chat_starter: '',
                current_song: '',
                ick: '',
                green_flag: '',
                is_active: false
              });
            
            if (insertError) throw insertError;
            window.location.href = '/onboarding';
            return { error: null };
          }

          if (profileError) {
            throw profileError;
          }

          // Redirect to onboarding if profile is missing or incomplete
          if (!profile || !profile.first_name || !profile.gender) {
            window.location.href = '/onboarding';
            return { error: null };
          }

          // Check and create chat preferences if needed
          const { data: prefs, error: prefsError } = await supabase
            .from('chat_preferences')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (prefsError) throw prefsError;

          if (!prefs) {
            const { error: createPrefsError } = await supabase
              .from('chat_preferences')
              .upsert({
                user_id: data.user.id,
                min_age: 18,
                max_age: 100,
                show_me: [],
                preferred_gender: null,
                preferred_city: null
              });

            if (createPrefsError) throw createPrefsError;
          }
        } catch (error) {
          console.error('Profile check error:', error);
          return { error };
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    useAuthStore.getState().setUser(session.user);
  } else {
    useAuthStore.getState().setUser(null);
    supabase.auth.refreshSession(); // Try to refresh if session exists
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setUser(session?.user ?? null);
});
