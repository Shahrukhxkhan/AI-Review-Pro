import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export const useRealtimeStatus = (userId: string | undefined) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('reconnecting');
  const channelRef = useRef<any>(null);
  const { showToast } = useToast();
  const failedAttempts = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const supabase = getSupabase();
      if (!supabase) return;

      channelRef.current = supabase
        .channel(`heartbeat-${userId}`)
        .subscribe((s) => {
          if (s === 'SUBSCRIBED') {
            setStatus('connected');
            failedAttempts.current = 0;
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
            handleDisconnect();
          }
        });
    };

    const handleDisconnect = () => {
      setStatus('disconnected');
      failedAttempts.current += 1;
      
      if (failedAttempts.current >= 3) {
        showToast('Connection lost — some data may be outdated. Refresh to reconnect.', '#993C1D', 0);
      } else {
        setStatus('reconnecting');
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (channelRef.current) getSupabase()?.removeChannel(channelRef.current);
    };
  }, [userId]);

  return { status };
};
