import { Notification } from '../types';
import { getSupabase } from './supabase';

export const addNotification = async (
  userId: string,
  message: string,
  type: Notification['type']
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    message,
    type,
  });
  if (error) console.error('Error adding notification:', error);
};

export const markAsRead = async (notificationId: string): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
};
