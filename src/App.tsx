import React, { useState, useEffect, useTransition } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardPage from '@/components/DashboardView'; 
import AnalyticsPage from '@/components/AnalyticsView';
import ReportsPage from '@/components/ReportsView';
import NotificationCenter from '@/components/NotificationCenter';
import NewReviewPage from '@/components/NewReviewView';
import HistoryPage from '@/components/HistoryView';
import SettingsPage from '@/components/SettingsView';
import LoginPage from '@/components/LoginView';
import { ToastProvider } from '@/context/ToastContext';
import RealtimeStatus from '@/components/RealtimeStatus';

import { CodeReview, Streak, DBUser } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { loadFromLocal, saveToLocal, SEED_REVIEWS } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { Plus } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [isPending, startTransition] = useTransition();
  const [streak, setStreak] = useState<Streak>({
    id: 'local_streak',
    user_id: 'local_user',
    current_streak: 3,
    longest_streak: 5,
    last_reviewed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  });
  
  const isSupabaseConnected = isSupabaseConfigured();
  const supabase = getSupabase();
  const { user: currentUser, loading: isUserLoading, signOut } = useUser();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.removeAllChannels();
    }
    await signOut();
  };

  // Sync tab and review selections with URL pathname
  useEffect(() => {
    const handleUrlRouting = () => {
      const pathname = window.location.pathname;
      if (pathname === '/history') {
        setCurrentTab('history');
        setSelectedReviewId(null);
      } else if (pathname === '/new-review') {
        setCurrentTab('new-review');
        setSelectedReviewId(null);
      } else if (pathname === '/reports') {
        setCurrentTab('reports');
        setSelectedReviewId(null);
      } else if (pathname === '/settings') {
        setCurrentTab('settings');
        setSelectedReviewId(null);
      } else if (pathname.startsWith('/review/')) {
        const id = pathname.substring('/review/'.length);
        setCurrentTab('history');
        setSelectedReviewId(id);
      } else {
        setCurrentTab('dashboard');
        setSelectedReviewId(null);
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  const changeTab = (tab: string) => {
    startTransition(() => {
      setCurrentTab(tab);
      setSelectedReviewId(null);
      const newPath = tab === 'dashboard' ? '/' : `/${tab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    });
  };

  const handleSelectReviewId = (id: string | null) => {
    setSelectedReviewId(id);
    const newPath = id ? `/review/${id}` : '/history';
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  // Handle user statistics and records synchronization
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const loadUserData = async () => {
      // Offline fallback / mock check
      if (currentUser.id === 'local_user' || !isSupabaseConnected || !supabase) {
        const localReviews = loadFromLocal<CodeReview[]>('gamified_code_reviews', SEED_REVIEWS);
        setReviews(localReviews);

        const localStreak = loadFromLocal<Streak>('gamified_streaks', {
          id: 'local_streak',
          user_id: 'local_user',
          current_streak: 3,
          longest_streak: 5,
          last_reviewed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        });
        setStreak(localStreak);
        return;
      }

      // Supabase Active session syncing using parallel executions
      try {
        const [streakResponse, reviewsResponse] = await Promise.all([
          supabase
            .from('streaks')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle(),
          supabase
            .from('reviews')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        ]);

        if (streakResponse.data) {
          setStreak(streakResponse.data);
        } else {
          // Initialize user's streak row if absent
          const { data: newStreak } = await supabase
            .from('streaks')
            .upsert({
              user_id: currentUser.id,
              current_streak: 0,
              longest_streak: 0
            })
            .select()
            .single();
          if (newStreak) setStreak(newStreak);
        }

        if (reviewsResponse.data) {
          setReviews(reviewsResponse.data as CodeReview[]);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.error('Error fetching dashboard details via parallel queries:', err);
      }
    };

    loadUserData();
  }, [currentUser, isSupabaseConnected, supabase]);

  // Synchronize internal state
  const updateReviewsState = (newReviews: CodeReview[]) => {
    setReviews(newReviews);
    saveToLocal('gamified_code_reviews', newReviews);
  };

  // Triggered on Code Review analysis submission
  const handleAddReview = async (newReviewData: Omit<CodeReview, 'id' | 'user_id' | 'created_at'> & { id?: string; user_id?: string; created_at?: string }) => {
    let freshReview: CodeReview;
    
    if (newReviewData.id) {
      // Record was already saved on server side
      freshReview = newReviewData as CodeReview;
    } else {
      // Local/offline fallback insert
      freshReview = {
        ...newReviewData,
        id: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        user_id: currentUser?.id || 'local_user',
        created_at: new Date().toISOString()
      };

      if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
        try {
          const { data, error } = await supabase
            .from('reviews')
            .insert({
              user_id: currentUser.id,
              language: newReviewData.language,
              code_snippet: newReviewData.code_snippet,
              overall_score: newReviewData.overall_score,
              bug_score: newReviewData.bug_score,
              security_score: newReviewData.security_score,
              readability_score: newReviewData.readability_score,
              complexity_score: newReviewData.complexity_score,
              feedback: newReviewData.feedback
            })
            .select()
            .single();

          if (error) {
            console.error('Error inserting review to Supabase:', error.message);
          } else if (data) {
            freshReview = data as CodeReview;
          }
        } catch (err) {
          console.error('Supabase query database write failed, falling back to UI state:', err);
        }
      }
    }

    // Now, let's update streak count
    if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
      try {
        // Increment logic for streak count
        const today = new Date().toDateString();
        const lastRevString = streak.last_reviewed_at;
        const lastRevDay = lastRevString ? new Date(lastRevString).toDateString() : null;

        let newCurrent = streak.current_streak;
        if (lastRevDay !== today) {
          // If last reviewed yesterday or never reviewed, increment
          const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toDateString();
          if (lastRevDay === yesterday || !lastRevString) {
            newCurrent += 1;
          } else {
            newCurrent = 1; // reset broken streak
          }
        }
        const newLongest = Math.max(newCurrent, streak.longest_streak);

        const { data: updatedStreak } = await supabase
          .from('streaks')
          .upsert({
            user_id: currentUser.id,
            current_streak: newCurrent,
            longest_streak: newLongest,
            last_reviewed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (updatedStreak) {
          setStreak(updatedStreak);
        }
      } catch (err) {
        console.error('Supabase streak update write failed:', err);
      }
    } else {
      // Local simulated code review streak mechanics
      const today = new Date().toDateString();
      const lastRevString = streak.last_reviewed_at;
      const lastRevDay = lastRevString ? new Date(lastRevString).toDateString() : null;

      let newCurrent = streak.current_streak;
      if (lastRevDay !== today) {
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toDateString();
        if (lastRevDay === yesterday || !lastRevString) {
          newCurrent += 1;
        } else {
          newCurrent = 1;
        }
      }
      const newLongest = Math.max(newCurrent, streak.longest_streak);
      const updatedStreak: Streak = {
        ...streak,
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_reviewed_at: new Date().toISOString()
      };
      setStreak(updatedStreak);
      saveToLocal('gamified_streaks', updatedStreak);
    }

    const updatedReviews = [freshReview, ...reviews];
    updateReviewsState(updatedReviews);
  };

  // Actions
  const handleDeleteReview = async (id: string) => {
    if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
      try {
        await supabase
          .from('reviews')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.error('Failed to eliminate review in remote cloud storage:', err);
      }
    }
    const updatedReviews = reviews.filter(r => r.id !== id);
    updateReviewsState(updatedReviews);
  };

  const handleResetToSeed = () => {
    localStorage.removeItem('gamified_code_reviews');
    localStorage.removeItem('gamified_streaks');
    updateReviewsState(SEED_REVIEWS);
    const testStreak = {
      id: 'local_streak',
      user_id: 'local_user',
      current_streak: 3,
      longest_streak: 5,
      last_reviewed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    };
    setStreak(testStreak);
    saveToLocal('gamified_streaks', testStreak);
  };

  const handleClearAll = async () => {
    if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
      try {
        await supabase
          .from('reviews')
          .delete()
          .eq('user_id', currentUser.id);
        
        await supabase
          .from('streaks')
          .update({ current_streak: 0, last_reviewed_at: null })
          .eq('user_id', currentUser.id);
      } catch (err) {
        console.error('Could not clean remote tables:', err);
      }
    }
    updateReviewsState([]);
    const clearedStreak = {
      id: 'local_streak',
      user_id: 'local_user',
      current_streak: 0,
      longest_streak: 0,
      last_reviewed_at: null
    };
    setStreak(clearedStreak);
    saveToLocal('gamified_streaks', clearedStreak);
  };

  const handleGithubLogin = async () => {
    if (isSupabaseConnected && supabase) {
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
      } catch (e) {
        console.error('Failed to initiate GitHub OAuth:', e);
      }
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020203] font-sans animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Initializing AI-Review Pro...</p>
        </div>
      </div>
    );
  }

  // Intentional client-side-only protection as no Next.js middleware layer exists.
  // This guard ensures that if Supabase is configured, users must be authenticated to access protected views.
  if (isSupabaseConnected && !currentUser) {
    return (
      <div className="min-h-screen bg-[#020203] flex items-center justify-center w-full">
        <LoginPage onGithubLogin={handleGithubLogin} />
      </div>
    );
  }

  return (
    <ToastProvider>
        <div id="app-root" className="grid grid-cols-[260px_1fr] min-h-screen bg-bg text-ink font-sans">
          
          {/* Sidebar */}
          <Sidebar 
            currentTab={currentTab} 
            setCurrentTab={changeTab} 
            currentUser={currentUser}
            onLogout={handleLogout}
          />
    
          {/* Main Content Area */}
          <div className="flex flex-col bg-[radial-gradient(circle_at_top_right,rgba(0,255,170,0.05),transparent_40%)]">
            {/* Topbar */}
            <header className="h-[120px] flex items-end justify-between px-12 pb-8">
              <div className="header-title">
                <p className="font-mono text-[12px] opacity-50">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} // GH_AUTH_CONNECTED</p>
                <h1 className="font-display text-[48px] tracking-tighter">{currentTab.replace('-', ' ')}</h1>
              </div>
              <div className="flex items-center gap-6 pb-2">
                  <RealtimeStatus userId={currentUser?.id} />
                  <NotificationCenter />
                  <button 
                    onClick={() => changeTab('new-review')}
                    className="bg-accent text-bg px-5 py-3 rounded text-[12px] font-bold uppercase tracking-wider hover:opacity-90"
                  >
                    + New Review
                  </button>
              </div>
            </header>
    
            {/* Content */}
            <main id="main-content" className="flex-1 overflow-y-auto px-12 pb-12">
              {isPending ? (
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : (
                <>
                  {currentTab === 'dashboard' && (
                    <DashboardPage 
                      currentUser={currentUser}
                      onGithubLogin={handleGithubLogin}
                      onLogout={handleLogout}
                      onNavigateToTab={changeTab}
                      onSelectReviewId={handleSelectReviewId}
                      reviews={reviews}
                      streak={streak}
                    />
                  )}
                  
                  {currentTab === 'progress' && (
                    <AnalyticsPage currentUser={currentUser} reviews={reviews} />
                  )}
                  
                  {currentTab === 'reports' && (
                    <ReportsPage />
                  )}
                  
                  {currentTab === 'new-review' && (
                    <NewReviewPage onAddReview={handleAddReview} />
                  )}
    
                  {currentTab === 'history' && (
                    <HistoryPage 
                      reviews={reviews} 
                      onDeleteReview={handleDeleteReview} 
                      selectedReviewId={selectedReviewId}
                      onSelectReviewId={handleSelectReviewId}
                    />
                  )}
    
                  {currentTab === 'settings' && (
                    <SettingsPage 
                      currentUser={currentUser}
                      streak={streak}
                      onResetToSeed={handleResetToSeed} 
                      onClearAll={handleClearAll} 
                      onGithubLogin={handleGithubLogin}
                      onLogout={handleLogout}
                      isSupabaseConnected={isSupabaseConnected} 
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </div>
    </ToastProvider>
  );
}
