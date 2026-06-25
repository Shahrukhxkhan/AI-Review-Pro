import { CodeReview, Report } from '../types';
import { getSupabase } from './supabase';

export const generateReport = async (
  userId: string,
  reviews: CodeReview[],
  type: 'weekly' | 'monthly'
): Promise<Report> => {
  const reviewsCompleted = reviews.length;
  const averageScore =
    reviews.reduce((acc, r) => acc + r.overall_score, 0) / (reviewsCompleted || 1);
  
  // Simple most common issue detection
  const issueCounts: Record<string, number> = {};
  reviews.forEach(r => {
    r.feedback.key_issues?.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });
  
  let mostCommonIssue = 'None';
  let maxCount = 0;
  for (const issue in issueCounts) {
    if (issueCounts[issue] > maxCount) {
      maxCount = issueCounts[issue];
      mostCommonIssue = issue;
    }
  }

  const report: Omit<Report, 'id' | 'created_at'> = {
    user_id: userId,
    type,
    start_date: new Date().toISOString(), // Simplified
    end_date: new Date().toISOString(),
    reviews_completed: reviewsCompleted,
    average_score: averageScore,
    most_common_issue: mostCommonIssue,
    improvement_percentage: 0, // Placeholder
  };

  const supabase = getSupabase();
  const { data, error } = await supabase.from('reports').insert(report).select().single();
  
  if (error) throw error;
  return data;
};
