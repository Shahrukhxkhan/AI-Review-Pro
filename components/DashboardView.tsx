import React, { useMemo } from 'react';
import { 
  Plus,
  Code2,
  Bug,
  ShieldCheck,
  BookOpen,
  Terminal
} from 'lucide-react';
import { CodeReview, Streak, DBUser } from '@/types';
import { formatDate } from '@/lib/utils';

interface DashboardViewProps {
  reviews: CodeReview[];
  streak: Streak;
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({ 
  reviews = [], 
  streak,
  onNavigateToTab 
}: DashboardViewProps) {

  // Stats calculation
  const stats = useMemo(() => {
    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.overall_score, 0) / totalReviews : 0;
    const topIssue = 'Best Practices'; // Simplified for now as per design spec needs

    return { totalReviews, avgScore, currentStreak: streak?.current_streak || 0, topIssue };
  }, [reviews, streak]);

  // Chart data
  const chartData = useMemo(() => {
    const last8 = reviews.slice(-8);
    const maxScore = 100;
    return last8.map(r => ({
        score: r.overall_score,
        height: (r.overall_score / maxScore) * 100,
        color: r.overall_score >= 75 ? '#1D9E75' : r.overall_score >= 50 ? '#BA7517' : '#993C1D'
    }));
  }, [reviews]);

  // Quality Breakdown
  const qualityBreakdown = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { readability: 0, complexity: 0, bug: 0, security: 0 };
    
    const sum = reviews.reduce((acc, r) => ({
        readability: acc.readability + r.readability_score,
        complexity: acc.complexity + r.complexity_score,
        bug: acc.bug + r.bug_score,
        security: acc.security + r.security_score,
    }), { readability: 0, complexity: 0, bug: 0, security: 0 });

    return {
        readability: Math.round(sum.readability / total),
        complexity: Math.round(sum.complexity / total),
        bug: Math.round(sum.bug / total),
        security: Math.round(sum.security / total),
    };
  }, [reviews]);

  return (
    <div className="space-y-[16px]">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-4 gap-[10px]">
            {[
                { label: 'Reviews', value: stats.totalReviews, meta: '' },
                { label: 'Avg score', value: stats.avgScore.toFixed(0), meta: 'Composite' },
                { label: 'Streak', value: stats.currentStreak, meta: 'Days' },
                { label: 'Top issue', value: stats.topIssue, meta: 'Most frequent' },
            ].map(s => (
                <div key={s.label} className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[8px] p-[14px]">
                    <div className="text-[10px] uppercase text-[#8a9ab0] tracking-[0.5px] mb-[6px]">{s.label}</div>
                    <div className="text-[20px] font-medium text-[#1a2332] tracking-[-0.4px]">{s.value}</div>
                    <div className="text-[10px] text-[#8a9ab0]">{s.meta}</div>
                </div>
            ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-[12px]">
            {/* Score Trend */}
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px]">
                <div className="text-[12px] font-medium text-[#1a2332]">Score trend</div>
                <div className="text-[10px] text-[#b0bcc8] mb-[12px]">Last 8 reviews</div>
                <div className="flex items-end gap-[4px] h-[68px]">
                    {chartData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-[4px]">
                            <div className="w-full rounded-[2px_2px_0_0]" style={{ height: `${d.height}%`, backgroundColor: d.color }}></div>
                            <div className="text-[9px] text-[#b0bcc8]">{i + 1}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quality Breakdown */}
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px]">
                <div className="text-[12px] font-medium text-[#1a2332]">Quality breakdown</div>
                <div className="text-[10px] text-[#b0bcc8] mb-[12px]">Average scores</div>
                <div className="space-y-[8px]">
                    {[
                        { label: 'Readability', score: qualityBreakdown.readability, color: '#1D9E75' },
                        { label: 'Complexity', score: qualityBreakdown.complexity, color: '#1D9E75' },
                        { label: 'Bug risk', score: qualityBreakdown.bug, color: '#BA7517' },
                        { label: 'Security', score: qualityBreakdown.security, color: '#993C1D' },
                    ].map(q => (
                        <div key={q.label} className="flex items-center gap-[8px]">
                            <div className="text-[11px] text-[#5a6a80] w-[76px]">{q.label}</div>
                            <div className="flex-1 h-[3px] bg-[#e0e5eb] rounded-[2px] overflow-hidden">
                                <div className="h-full rounded-[2px]" style={{ width: `${q.score}%`, backgroundColor: q.color }}></div>
                            </div>
                            <div className="text-[11px] font-medium text-[#1a2332] w-[26px] text-right">{q.score}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px]">
            <div className="text-[12px] font-medium text-[#1a2332]">Recent reviews</div>
            <div className="text-[10px] text-[#b0bcc8] mb-[12px]">Last 5 submissions</div>
            {reviews.slice(-5).reverse().map((r, i) => (
                <div key={r.id} className={`flex items-center justify-between py-[8px] ${i < 4 ? 'border-b-[0.5px] border-[#e0e5eb]' : ''}`}>
                    <div className="flex items-center gap-[12px]">
                        <div className="text-[9px] font-medium text-[#085041] bg-[#E1F5EE] border-[0.5px] border-[#9FE1CB] px-[6px] py-[2px] rounded-[3px]">{r.language}</div>
                        <div>
                            <div className="text-[11px] font-medium text-[#1a2332]">review_{r.id.substring(0, 4)}</div>
                            <div className="text-[10px] text-[#b0bcc8]">{formatDate(r.created_at)}</div>
                        </div>
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: r.overall_score >= 75 ? '#1D9E75' : r.overall_score >= 50 ? '#BA7517' : '#993C1D' }}>
                        {r.overall_score}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
