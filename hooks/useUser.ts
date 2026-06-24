import { useState, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { DBUser } from '@/types';

export interface ExtendedUser extends DBUser {
  avatar_url?: string;
  name?: string;
}

export function useUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabase();
  const isSupabaseConnected = isSupabaseConfigured();

  useEffect(() => {
    if (!isSupabaseConnected || !supabase) {
      // Offline fallback mock state
      const mockUser: ExtendedUser = {
        id: 'local_user',
        github_username: 'octocat_reviewer',
        email: 'octocat@github.com',
        created_at: new Date().toISOString(),
        avatar_url: 'https://avatars.githubusercontent.com/u/5832347?v=4',
        name: 'The Review Octocat'
      };
      
      const mockSession = {
        user: {
          id: 'local_user',
          email: 'octocat@github.com',
          user_metadata: {
            preferred_username: 'octocat_reviewer',
            avatar_url: 'https://avatars.githubusercontent.com/u/5832347?v=4',
            full_name: 'The Review Octocat'
          }
        },
        access_token: 'mock_token_123'
      };

      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      return;
    }

    // Live Supabase connection
    const fetchSession = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        
        if (activeSession?.user) {
          const uMetadata = activeSession.user.user_metadata || {};
          const githubUser: ExtendedUser = {
            id: activeSession.user.id,
            github_username: uMetadata.preferred_username || uMetadata.user_name || activeSession.user.email?.split('@')[0] || 'github_user',
            email: activeSession.user.email || '',
            created_at: activeSession.user.created_at,
            avatar_url: uMetadata.avatar_url || 'https://avatars.githubusercontent.com/u/5832347?v=4',
            name: uMetadata.full_name || uMetadata.name || ''
          };
          setUser(githubUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
      setSession(activeSession ?? null);
      if (activeSession?.user) {
        const uMetadata = activeSession.user.user_metadata || {};
        const githubUser: ExtendedUser = {
          id: activeSession.user.id,
          github_username: uMetadata.preferred_username || uMetadata.user_name || activeSession.user.email?.split('@')[0] || 'github_user',
          email: activeSession.user.email || '',
          created_at: activeSession.user.created_at,
          avatar_url: uMetadata.avatar_url || 'https://avatars.githubusercontent.com/u/5832347?v=4',
          name: uMetadata.full_name || uMetadata.name || ''
        };
        setUser(githubUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, isSupabaseConnected]);

  const signOut = async () => {
    if (isSupabaseConnected && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  return { user, session, loading, signOut };
}
