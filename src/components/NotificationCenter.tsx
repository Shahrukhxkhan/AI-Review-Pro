import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useUser } from '@/hooks/useUser';

export default function NotificationCenter() {
  const { user } = useUser();
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); color: #475569; } 50% { transform: scale(1.2); color: #1D9E75; } }
        .bell-pulse { animation: pulse 0.4s ease-in-out; }
      `}</style>
      <button id="notification-bell" onClick={() => setIsOpen(!isOpen)} className="p-2 bg-white rounded-full relative">
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
