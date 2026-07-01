import React, { useMemo } from 'react';
import { CodeReview, DBUser } from '@/types';
import { useChartData } from '@/hooks/useChartData';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ComparisonView from '@/components/ComparisonView';

interface AnalyticsViewProps {
  reviews: CodeReview[];
  currentUser: DBUser | null;
}

export default function AnalyticsView({ reviews, currentUser }: AnalyticsViewProps) {
  const { issueFrequency, dimensionAverages, loading } = useChartData(currentUser?.id);

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
        
        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-[12px]">
            {/* Issue Frequency */}
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px] h-[248px]">
                <div className="text-[12px] font-medium text-[#1a2332] mb-[12px]">Most common issues</div>
                {loading ? (
                    <div className="w-full h-[200px] bg-[#f4f6f8] rounded-[8px]"></div>
                ) : issueFrequency.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <div className="text-[#b0bcc8] mb-2"><span className="text-[28px]">📊</span></div>
                        <div className="text-[13px] font-medium text-[#8a9ab0]">No review data yet</div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart layout="vertical" data={issueFrequency} margin={{ right: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e5eb" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} width={72} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2735', color: '#e8edf3', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Bar dataKey="count" fill="#1D9E75" radius={[0, 3, 3, 0]} barSize={14} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Quality Dimensions */}
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px] h-[248px]">
                <div className="text-[12px] font-medium text-[#1a2332] mb-[12px]">Quality dimensions</div>
                {loading ? (
                    <div className="w-full h-[200px] bg-[#f4f6f8] rounded-[8px]"></div>
                ) : dimensionAverages.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <div className="text-[#b0bcc8] mb-2"><span className="text-[28px]">📊</span></div>
                        <div className="text-[13px] font-medium text-[#8a9ab0]">No review data yet</div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart layout="vertical" data={dimensionAverages} margin={{ right: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e5eb" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="dimension" tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} width={76} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2735', color: '#e8edf3', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Bar dataKey="score" radius={[0, 3, 3, 0]} barSize={12}>
                                {dimensionAverages.map((entry, index) => (
                                    <Cell key={index} fill={entry.score >= 75 ? "#1D9E75" : entry.score >= 50 ? "#BA7517" : "#993C1D"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>

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
        <div className="flex items-center gap-[12px] py-[24px]">
            <div className="flex-1 h-[0.5px] bg-[#e0e5eb]"></div>
            <div className="text-[10px] uppercase text-[#8a9ab0] tracking-wider">Period comparison</div>
            <div className="flex-1 h-[0.5px] bg-[#e0e5eb]"></div>
        </div>

        <ComparisonView currentUser={currentUser} />
    </div>
  );
}
