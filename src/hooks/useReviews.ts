import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { CodeReview } from '@/types';

export const useReviews = (userId: string | undefined) => {
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchReviews = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) setError(error.message);
      else setReviews(data || []);
      setIsLoading(false);
    };

    fetchReviews();

    const supabase = getSupabase();
    if (!supabase) return;

    channelRef.current = supabase
      .channel(`reviews-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReviews((prev) => [payload.new as CodeReview, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReviews((prev) => prev.map((r) => (r.id === payload.new.id ? (payload.new as CodeReview) : r)));
          } else if (payload.eventType === 'DELETE') {
            setReviews((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  return { reviews, isLoading, error };
};
