'use client';

import React from 'react';
import SettingsView from '@/components/SettingsView';
import { Streak, DBUser } from '@/types';

interface PageProps {
  currentUser: DBUser | null;
  streak: Streak;
  onResetToSeed: () => void;
  onClearAll: () => void;
  onGithubLogin: () => void;
  onLogout: () => void;
  isSupabaseConnected: boolean;
}

export default function SettingsPage({ 
  currentUser,
  streak,
  onResetToSeed, 
  onClearAll, 
  onGithubLogin,
  onLogout,
  isSupabaseConnected 
}: PageProps) {
  return (
    <div id="next-settings-page" className="py-2">
      <SettingsView 
        currentUser={currentUser}
        streak={streak}
        onResetToSeed={onResetToSeed} 
        onClearAll={onClearAll} 
        onGithubLogin={onGithubLogin}
        onLogout={onLogout}
        isSupabaseConnected={isSupabaseConnected} 
      />
    </div>
  );
}
