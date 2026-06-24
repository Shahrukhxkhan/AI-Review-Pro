'use client';

import React from 'react';
import DashboardView from '@/components/DashboardView';
import { CodeReview, Streak, DBUser } from '@/types';

interface PageProps {
  reviews: CodeReview[];
  streak: Streak;
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardPage({ 
  reviews, 
  streak,
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab 
}: PageProps) {
  return (
    <div id="next-dashboard-page" className="py-2">
      <DashboardView 
        reviews={reviews} 
        streak={streak}
        currentUser={currentUser}
        onGithubLogin={onGithubLogin}
        onLogout={onLogout}
        onNavigateToTab={onNavigateToTab} 
      />
    </div>
  );
}
