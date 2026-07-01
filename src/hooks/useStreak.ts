import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Streak } from '@/types';
import { useToast } from '@/context/ToastContext';

export const useStreak = (userId: string | undefined) => {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const prevStreak = useRef<number>(0);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchStreak = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setStreak(data);
        prevStreak.current = data.current_streak;
      }
      setIsLoading(false);
    };

    fetchStreak();

    const supabase = getSupabase();
    if (!supabase) return;

    channelRef.current = supabase
      .channel(`streak-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'streaks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newStreak = payload.new as Streak;
          
          if (newStreak.current_streak > prevStreak.current) {
            // Trigger animation (handled via state change)
          } else if (newStreak.current_streak === 1 && prevStreak.current > 1) {
            showToast('Streak reset — start a new one today!', '#993C1D', 4000);
          }
          
          setStreak(newStreak);
          prevStreak.current = newStreak.current_streak;
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  return { streak, isLoading };
};
