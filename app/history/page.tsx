'use client';

import React from 'react';
import HistoryView from '@/components/HistoryView';
import { CodeReview } from '@/types';

interface PageProps {
  reviews: CodeReview[];
  onDeleteReview: (id: string) => void;
  selectedReviewId?: string | null;
  onSelectReviewId?: (id: string | null) => void;
}

export default function HistoryPage({ reviews, onDeleteReview, selectedReviewId, onSelectReviewId }: PageProps) {
  return (
    <div id="next-history-page" className="py-2">
      <HistoryView 
        reviews={reviews} 
        onDeleteReview={onDeleteReview} 
        selectedReviewId={selectedReviewId}
        onSelectReviewId={onSelectReviewId}
      />
    </div>
  );
}
