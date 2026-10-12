import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentProfile, signOut as sbSignOut, type UserProfile } from '@/lib/supabase';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
}

export interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isDemo: false,
  });

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getCurrentProfile();
      setState(prev => ({ ...prev, profile: p }));
    } catch (err) {
      console.error('Error refreshing profile', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const profile = await getCurrentProfile();
          if (mounted) {
            setState({
              user: session.user,
              profile,
              session,
              loading: false,
              isDemo: false,
            });
          }
        } else {
          // Check demo mock if present
          const demoUser = localStorage.getItem('medconnect_demo_user');
          if (demoUser && mounted) {
            const parsed = JSON.parse(demoUser);
            setState({
              user: { id: parsed.id || 'demo-patient-1', email: parsed.email || 'patient@medconnect.ai' } as any,
              profile: parsed,
              session: null,
              loading: false,
              isDemo: true,
            });
            return;
          }

          if (mounted) {
            setState(prev => ({ ...prev, loading: false }));
          }
        }
      } catch (err) {
        console.error('Auth initialization error', err);
        if (mounted) setState(prev => ({ ...prev, loading: false }));
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await getCurrentProfile();
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            isDemo: false,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            isDemo: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const handleSignOut = async () => {
    try {
      await sbSignOut();
    } catch {
      // ignore
    }
    localStorage.removeItem('medconnect_demo_user');
    setState({
      user: null,
      profile: null,
      session: null,
      loading: false,
      isDemo: false,
    });
  };

  return {
    ...state,
    signOut: handleSignOut,
    refreshProfile,
  };
}

export default useAuth;
