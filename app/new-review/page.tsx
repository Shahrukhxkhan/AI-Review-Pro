'use client';

import React from 'react';
import NewReviewView from '@/components/NewReviewView';
import { CodeReview } from '@/types';

interface PageProps {
  onAddReview: (review: Omit<CodeReview, 'id' | 'user_id' | 'created_at'>) => void;
}

export default function NewReviewPage({ onAddReview }: PageProps) {
  return (
    <div id="next-new-review-page" className="py-2">
      <NewReviewView onAddReview={onAddReview} />
    </div>
  );
}
