import React, { useMemo } from 'react';
import { CodeReview, DBUser } from '@/types';
import { useChartData } from '@/hooks/useChartData';
import { useReviews } from '@/hooks/useReviews';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from 'recharts';
import ComparisonView from '@/components/ComparisonView';
import { TrendingUp, BarChart3, Activity, Award } from 'lucide-react';

interface AnalyticsViewProps {
  reviews: CodeReview[];
  currentUser: DBUser | null;
}

export default function AnalyticsView({ currentUser, reviews }: AnalyticsViewProps) {
  const { reviews: fetchedReviews } = useReviews(currentUser?.id);
  const activeReviews = (reviews && reviews.length > 0) ? reviews : fetchedReviews;
  const { issueFrequency, dimensionAverages, loading } = useChartData(activeReviews);

  const metrics = useMemo(() => {
    if (activeReviews.length === 0) return { score: 0, readability: 0, security: 0, complexity: 0 };
    const sum = activeReviews.reduce((acc, r) => ({
      score: acc.score + r.overall_score,
      readability: acc.readability + r.readability_score,
      security: acc.security + r.security_score,
      complexity: acc.complexity + r.complexity_score,
    }), { score: 0, readability: 0, security: 0, complexity: 0 });
    const count = activeReviews.length;
    return {
      score: Math.round(sum.score / count),
      readability: Math.round(sum.readability / count),
      security: Math.round(sum.security / count),
      complexity: Math.round(sum.complexity / count),
    };
  }, [activeReviews]);

  const progressData = useMemo(() => {
    return [...activeReviews]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(r => ({
        date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: r.overall_score
      }));
  }, [activeReviews]);

  return (
    <div className="space-y-6">
      {/* Title & Subheader */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Audit Quality & Progress Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time code health vectors across security, performance, and defect density
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500 bg-[#0b0b0e] px-3 py-1.5 rounded-lg border border-slate-800">
          {activeReviews.length} total dataset audits
        </div>
      </div>
        
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Issue Frequency */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              Most Common Issues
            </span>
            <span className="text-[10px] font-mono text-slate-500">Defect Occurrences</span>
          </div>

          {loading ? (
            <div className="w-full h-[200px] bg-slate-900/40 rounded-xl animate-pulse" />
          ) : issueFrequency.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <div className="text-slate-600 mb-2 text-2xl">📊</div>
              <div className="text-xs font-medium text-slate-500">No review data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={issueFrequency} margin={{ right: 16, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} 
                  itemStyle={{ color: '#00ffaa' }}
                />
                <Bar dataKey="count" fill="#00ffaa" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quality Dimensions */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Quality Dimensions
            </span>
            <span className="text-[10px] font-mono text-slate-500">Avg % (0-100)</span>
          </div>

          {loading ? (
            <div className="w-full h-[200px] bg-slate-900/40 rounded-xl animate-pulse" />
          ) : dimensionAverages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <div className="text-slate-600 mb-2 text-2xl">📊</div>
              <div className="text-xs font-medium text-slate-500">No review data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={dimensionAverages} margin={{ right: 16, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dimension" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} 
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
                  {dimensionAverages.map((entry, index) => (
                    <Cell key={index} fill={entry.score >= 75 ? "#00ffaa" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Overall Score Trajectory
          </span>
          <span className="text-[10px] font-mono text-slate-500">Historical Trend</span>
        </div>

        {progressData.length < 2 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <div className="text-slate-600 mb-2 text-2xl">📈</div>
            <div className="text-xs font-medium text-slate-500">Need at least 2 reviews to render a trajectory curve</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData} margin={{ right: 16, top: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#00ffaa" 
                strokeWidth={2.5} 
                dot={{ r: 4, fill: '#00ffaa', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#00ffaa' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg Quality Score', value: `${metrics.score}%`, color: metrics.score >= 75 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Readability', value: `${metrics.readability}%`, color: 'text-indigo-400' },
          { label: 'Security Health', value: `${metrics.security}%`, color: 'text-rose-400' },
          { label: 'Complexity Index', value: `${metrics.complexity}%`, color: 'text-cyan-400' },
        ].map(m => (
          <div key={m.label} className="bg-[#0b0b0e] border border-slate-800/80 rounded-xl p-4 shadow-md">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1 font-bold">{m.label}</div>
            <div className={`text-2xl font-mono font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Period comparison divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-slate-800" />
        <div className="text-[10px] uppercase text-slate-500 font-mono tracking-widest">Temporal Benchmarking</div>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <ComparisonView currentUser={currentUser} />
    </div>
  );
}
