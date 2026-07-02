import React from 'react';
import { DBUser } from '@/types';

interface DashboardViewProps {
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({ 
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab 
}: DashboardViewProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {currentUser?.email || 'User'}</p>
    </div>
  );
}
