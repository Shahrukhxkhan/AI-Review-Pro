import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export interface Report {
  id: string;
  user_id: string;
  type: string;
  period: string;
  created_at: string;
}

export const useReports = (userId: string | undefined) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchReports = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (data) setReports(data);
      setIsLoading(false);
    };

    fetchReports();

    const supabase = getSupabase();
    if (!supabase) return;

    channelRef.current = supabase
      .channel(`reports-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newReport = payload.new as Report;
          setReports((prev) => [newReport, ...prev]);
          showToast(`New report ready — ${newReport.type} report for ${newReport.period}`, '#1D9E75', 5000);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  return { reports, isLoading };
};
