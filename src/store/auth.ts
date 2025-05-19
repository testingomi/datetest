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

      if (error) throw error;
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

      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

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

          if (!profile.first_name || !profile.gender) {
            window.location.href = '/onboarding';
            return { error: null };
          }

          const { data: prefs } = await supabase
            .from('chat_preferences')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (!prefs) {
            await supabase
              .from('chat_preferences')
              .insert({
                user_id: data.user.id,
                min_age: 18,
                max_age: 100,
                show_me: [],
                preferred_gender: null,
                preferred_city: null
              });
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
    try {
      await supabase.auth.signOut();
      localStorage.clear(); // Clear all local storage
      set({ user: null });
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      localStorage.clear(); // Force clear storage even if signOut fails
      set({ user: null });
      window.location.href = '/';
    }
  },
}));

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    useAuthStore.getState().setUser(session.user);
  } else {
    useAuthStore.getState().setUser(null);
    localStorage.removeItem('supabase.auth.token');
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    localStorage.clear();
    useAuthStore.getState().setUser(null);
    window.location.href = '/';
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.user) {
      useAuthStore.getState().setUser(session.user);
    }
  }
});