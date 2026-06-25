import React, { useMemo } from 'react';
import { CodeReview } from '@/types';

interface AnalyticsViewProps {
  reviews: CodeReview[];
}

export default function AnalyticsView({ reviews }: AnalyticsViewProps) {
  const weeklyData = useMemo(() => {
    // Group by week
    const weeks: Record<string, number> = {};
    reviews.forEach(r => {
      const date = new Date(r.created_at);
      const week = `${date.getFullYear()}-W${Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      weeks[week] = (weeks[week] || 0) + 1;
    });
    return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).map(([week, count]) => ({ week, count }));
  }, [reviews]);

  const metrics = useMemo(() => {
    if (reviews.length === 0) return { score: 0, readability: 0, security: 0, complexity: 0 };
    const sum = reviews.reduce((acc, r) => ({
      score: acc.score + r.overall_score,
      readability: acc.readability + r.readability_score,
      security: acc.security + r.security_score,
      complexity: acc.complexity + r.complexity_score,
    }), { score: 0, readability: 0, security: 0, complexity: 0 });
    const count = reviews.length;
    return {
      score: Math.round(sum.score / count),
      readability: Math.round(sum.readability / count),
      security: Math.round(sum.security / count),
      complexity: Math.round(sum.complexity / count),
    };
  }, [reviews]);

  return (
    <div className="space-y-[16px]">
        <h2 className="text-[16px] font-medium text-[#1a2332]">Progress Analytics</h2>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-[10px]">
            {[
                { label: 'Avg Score', value: metrics.score },
                { label: 'Readability', value: metrics.readability },
                { label: 'Security', value: metrics.security },
                { label: 'Complexity', value: metrics.complexity },
            ].map(m => (
                <div key={m.label} className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[8px] p-[14px]">
                    <div className="text-[10px] uppercase text-[#8a9ab0] tracking-[0.5px] mb-[6px]">{m.label}</div>
                    <div className="text-[20px] font-medium text-[#1a2332]">{m.value}</div>
                </div>
            ))}
        </div>

        {/* Weekly Chart */}
        <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px]">
            <div className="text-[12px] font-medium text-[#1a2332] mb-[12px]">Weekly Trends</div>
            <div className="flex items-end gap-[8px] h-[150px]">
                {weeklyData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-[4px]">
                        <div className="w-full rounded-[2px_2px_0_0] bg-[#1D9E75]" style={{ height: `${(d.count / (Math.max(...weeklyData.map(d => d.count), 1))) * 100}%` }}></div>
                        <div className="text-[9px] text-[#b0bcc8]">{d.week}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
