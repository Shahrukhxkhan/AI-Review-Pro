import React, { useMemo } from 'react';
import { 
  Plus,
} from 'lucide-react';
import { CodeReview, Streak, DBUser } from '@/types';
import { formatDate } from '@/lib/utils';
import { useChartData } from '@/hooks/useChartData';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

interface DashboardViewProps {
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({ 
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab 
}: DashboardViewProps) {
  const { reviews } = useReviews(currentUser?.id);
  const { streak } = useStreak(currentUser?.id);
  const { loading } = useNotifications(currentUser?.id);
  const { scoreTrend, weeklyActivity } = useChartData(reviews);

  // Stats calculation
  const stats = useMemo(() => {
    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.overall_score, 0) / totalReviews : 0;
    const topIssue = 'Best Practices';

    return { totalReviews, avgScore, currentStreak: streak?.current_streak || 0, topIssue };
  }, [reviews, streak]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="text-[#b0bcc8] mb-2"><span className="text-[28px]">📊</span></div>
      <div className="text-[13px] font-medium text-[#8a9ab0]">No data yet</div>
      <div className="text-[11px] text-[#b0bcc8]">Complete your first review to see insights</div>
    </div>
  );

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
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px] h-[248px]">
                <div className="text-[12px] font-medium text-[#1a2332] mb-[12px]">Score trend</div>
                {loading ? (
                    <div className="w-full h-[200px] bg-[#f4f6f8] rounded-[8px]"></div>
                ) : scoreTrend.length < 2 ? (
                    <div className="flex items-center justify-center h-[200px] text-[12px] text-[#8a9ab0]">Complete at least 2 reviews to see your trend</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={scoreTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e5eb" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2735', color: '#e8edf3', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Line type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#1D9E75', strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Weekly Activity */}
            <div className="bg-[#ffffff] border-[0.5px] border-[#e0e5eb] rounded-[12px] p-[16px] h-[248px]">
                <div className="text-[12px] font-medium text-[#1a2332] mb-[12px]">Weekly activity</div>
                {loading ? (
                    <div className="w-full h-[200px] bg-[#f4f6f8] rounded-[8px]"></div>
                ) : weeklyActivity.length === 0 || weeklyActivity.every(d => d.count === 0) ? (
                    <EmptyState />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklyActivity} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e5eb" vertical={false} />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} width={24} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2735', color: '#e8edf3', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                {weeklyActivity.map((entry, index) => (
                                    <Cell key={index} fill={index === weeklyActivity.length - 1 ? "#0F6E56" : "#1D9E75"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
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
