import React from 'react';
import { CodeReview, DBUser, Streak } from '@/types';
import AnalyticsView from './AnalyticsView';

interface DashboardViewProps {
  reviews: CodeReview[];
  streak: Streak;
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({ 
  reviews,
  streak,
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab 
}: DashboardViewProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p>Welcome, {currentUser?.email || 'User'}</p>
      </div>
      <AnalyticsView reviews={reviews || []} currentUser={currentUser} />
    </div>
  );
}
