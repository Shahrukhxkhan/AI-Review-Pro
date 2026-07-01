import { getSupabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export const useChartData = (userId: string | undefined) => {
    const [scoreTrend, setScoreTrend] = useState<{ date: string; score: number }[]>([]);
    const [issueFrequency, setIssueFrequency] = useState<{ type: string; count: number }[]>([]);
    const [dimensionAverages, setDimensionAverages] = useState<{ dimension: string; score: number }[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<{ week: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const supabase = getSupabase();
            if (!supabase) return;

            // Fetch all reviews for analysis
            const { data: reviews } = await supabase
                .from('reviews')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (!reviews) {
                setLoading(false);
                return;
            }

            // 1. Score Trend (last 30)
            const trendData = reviews.slice(-30).map(r => ({
                date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: r.overall_score
            }));
            setScoreTrend(trendData);

            // 2. Issue Frequency
            const issues: Record<string, number> = {};
            reviews.forEach(r => {
                if (r.feedback && Array.isArray(r.feedback.key_issues)) {
                    r.feedback.key_issues.forEach((issue: string) => {
                        issues[issue] = (issues[issue] || 0) + 1;
                    });
                }
            });
            const issueData = Object.entries(issues)
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6);
            setIssueFrequency(issueData);

            // 3. Dimension Averages
            const total = reviews.length;
            const sum = reviews.reduce((acc, r) => ({
                readability: acc.readability + (r.readability_score || 0),
                complexity: acc.complexity + (r.complexity_score || 0),
                bug: acc.bug + (r.bug_score || 0),
                security: acc.security + (r.security_score || 0),
            }), { readability: 0, complexity: 0, bug: 0, security: 0 });

            setDimensionAverages([
                { dimension: 'Readability', score: Math.round(sum.readability / total) },
                { dimension: 'Complexity', score: Math.round(sum.complexity / total) },
                { dimension: 'Bug risk', score: Math.round(sum.bug / total) },
                { dimension: 'Security', score: Math.round(sum.security / total) },
            ]);

            // 4. Weekly Activity
            const weekly: Record<string, number> = {};
            reviews.forEach(r => {
                const date = new Date(r.created_at);
                const monday = new Date(date);
                monday.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
                const key = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                weekly[key] = (weekly[key] || 0) + 1;
            });
            const weeklyData = Object.entries(weekly)
                .map(([week, count]) => ({ week, count }))
                .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
                .slice(-8);
            setWeeklyActivity(weeklyData);

            setLoading(false);
        };

        fetchData();
    }, [userId]);

    return { scoreTrend, issueFrequency, dimensionAverages, weeklyActivity, loading };
};
