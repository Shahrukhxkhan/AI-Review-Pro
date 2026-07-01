
import { getSupabase } from './supabase';

export interface PeriodData {
  totalReviews: number;
  avgScore: number;
  avgBugScore: number;
  avgSecurityScore: number;
  avgReadabilityScore: number;
  avgComplexityScore: number;
  topIssue: string;
  improvementRate: number;
  reviews: { date: string, score: number }[];
}

export const fetchPeriodData = async (
  userId: string,
  start: Date,
  end: Date
): Promise<PeriodData> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('overall_score, bug_score, security_score, readability_score, complexity_score, created_at, feedback')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      avgScore: 0,
      avgBugScore: 0,
      avgSecurityScore: 0,
      avgReadabilityScore: 0,
      avgComplexityScore: 0,
      topIssue: '-',
      improvementRate: 0,
      reviews: []
    };
  }

  const totalReviews = reviews.length;
  const avgScore = reviews.reduce((sum, r) => sum + r.overall_score, 0) / totalReviews;
  const avgBugScore = reviews.reduce((sum, r) => sum + r.bug_score, 0) / totalReviews;
  const avgSecurityScore = reviews.reduce((sum, r) => sum + r.security_score, 0) / totalReviews;
  const avgReadabilityScore = reviews.reduce((sum, r) => sum + r.readability_score, 0) / totalReviews;
  const avgComplexityScore = reviews.reduce((sum, r) => sum + r.complexity_score, 0) / totalReviews;

  const issues: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.feedback && Array.isArray(r.feedback.key_issues)) {
      r.feedback.key_issues.forEach((issue: string) => {
        issues[issue] = (issues[issue] || 0) + 1;
      });
    }
  });

  let topIssue = '-';
  let max = 0;
  for (const issue in issues) {
    if (issues[issue] > max) {
      max = issues[issue];
      topIssue = issue;
    }
  }

  const improvementRate = totalReviews > 1 
    ? ((reviews[totalReviews - 1].overall_score - reviews[0].overall_score) / reviews[0].overall_score) * 100 
    : 0;

  return {
    totalReviews,
    avgScore: Math.round(avgScore * 10) / 10,
    avgBugScore: Math.round(avgBugScore * 10) / 10,
    avgSecurityScore: Math.round(avgSecurityScore * 10) / 10,
    avgReadabilityScore: Math.round(avgReadabilityScore * 10) / 10,
    avgComplexityScore: Math.round(avgComplexityScore * 10) / 10,
    topIssue,
    improvementRate: Math.round(improvementRate),
    reviews: reviews.map(r => ({ date: r.created_at, score: r.overall_score }))
  };
};
