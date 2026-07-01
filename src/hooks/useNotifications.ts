import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Notification } from '@/types';
import { useToast } from '@/context/ToastContext';

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
      setIsLoading(false);
    };

    fetchNotifications();

    const supabase = getSupabase();
    if (!supabase) return;

    channelRef.current = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            // Bell animation handled in component via CSS class
            const bell = document.getElementById('notification-bell');
            if (bell) {
              bell.classList.add('bell-pulse');
              setTimeout(() => bell.classList.remove('bell-pulse'), 2000);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            setNotifications((prev) => prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n)));
            setUnreadCount(notifications => notifications.filter(n => !n.read).length);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  };

  return { notifications, unreadCount, isLoading, markAsRead };
};
