import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Notification } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { markAsRead } from '@/lib/notifications';
import { useUser } from '@/hooks/useUser';

export default function NotificationCenter() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };
    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-white rounded-full relative">
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b font-bold text-sm">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map(n => (
              <div key={n.id} className={`p-4 border-b text-xs ${n.read ? 'opacity-60' : ''}`}>
                <p>{n.message}</p>
                {!n.read && (
                    <button onClick={() => markAsRead(n.id)} className="text-indigo-500 mt-2 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3"/> Mark as read
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
