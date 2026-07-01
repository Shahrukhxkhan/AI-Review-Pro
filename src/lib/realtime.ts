import { getSupabase } from './supabase';

export const getRealtimeChannel = (userId: string, channelName: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;
  return supabase.channel(channelName);
};
