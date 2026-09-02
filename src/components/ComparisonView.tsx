import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AlertTriangle, GitCompare, Calendar } from 'lucide-react';
import { getDateRange } from '@/lib/dateUtils';
import { fetchPeriodData, PeriodData } from '@/lib/periodData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { DBUser } from '@/types';

interface ComparisonViewProps {
  currentUser: DBUser | null;
}

const PERIODS = ['This week', 'Last week', 'This month', 'Last month', 'Last 3 months'];

export default function ComparisonView({ currentUser }: ComparisonViewProps) {
  const [periodA, setPeriodA] = useState('Last week');
  const [periodB, setPeriodB] = useState('This week');
  const [data, setData] = useState<{ a: PeriodData | null, b: PeriodData | null }>({ a: null, b: null });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured. Displaying local simulated benchmarking.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const rangeA = getDateRange(periodA);
      const rangeB = getDateRange(periodB);
      
      try {
        const [resA, resB] = await Promise.all([
          fetchPeriodData(currentUser.id, rangeA.start, rangeA.end),
          fetchPeriodData(currentUser.id, rangeB.start, rangeB.end)
        ]);
        setData({ a: resA, b: resB });
      } catch (e: any) {
        console.error('Error fetching period data:', e);
        setError(e.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 200);
    return () => clearTimeout(timer);
  }, [periodA, periodB, currentUser]);

  const mergedData = useMemo(() => {
    if (!data.a || !data.b) return [];
    const len = Math.max(data.a.reviews.length, data.b.reviews.length);
    return Array.from({ length: len }).map((_, i) => ({
      index: i + 1,
      a: data.a?.reviews[i]?.score ?? null,
      b: data.b?.reviews[i]?.score ?? null,
    }));
  }, [data]);

  const MetricCard = ({ label, keyA, keyB, isIssue = false, isPercent = false }: any) => {
    const valA = data.a?.[keyA as keyof PeriodData];
    const valB = data.b?.[keyB as keyof PeriodData];
    
    if (loading) return <div className="h-[76px] w-full bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" />;

    let delta = 0;
    if (!isIssue && typeof valA === 'number' && typeof valB === 'number') delta = valB - valA;

    return (
      <div className="bg-[#050507] border border-slate-800/80 rounded-xl p-3.5">
        <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">{label}</div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#00ffaa]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ffaa]" />
            {valA !== undefined ? valA : '—'}{isPercent && valA !== undefined ? '%' : ''}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#38bdf8]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            {valB !== undefined ? valB : '—'}{isPercent && valB !== undefined ? '%' : ''}
          </div>
        </div>
        {!isIssue && typeof valA === 'number' && typeof valB === 'number' && (
          <div className={`text-[10px] font-mono mt-2 font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            {delta > 0 ? `▲ +${delta.toFixed(1)}` : delta < 0 ? `▼ ${Math.abs(delta).toFixed(1)}` : '— No change'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-accent" />
            Period Comparison & Cohort Benchmarks
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare quality, bug density, and review volume across two timeframes
          </p>
        </div>

        {/* Period Selectors */}
        <div className="flex items-center gap-3">
          {[{ label: 'Period A', val: periodA, set: setPeriodA, color: '#00ffaa' }, { label: 'Period B', val: periodB, set: setPeriodB, color: '#38bdf8' }].map(p => (
            <div key={p.label} className="space-y-1">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">{p.label}</div>
              <div className="relative">
                <select 
                  value={p.val} 
                  onChange={(e) => p.set(e.target.value)} 
                  className="bg-[#050507] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-accent cursor-pointer transition"
                  style={{ borderLeft: `3px solid ${p.color}` }}
                >
                  {PERIODS.map(o => <option key={o} value={o} className="bg-slate-900 text-slate-200">{o}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {periodA === periodB && (
        <div className="flex gap-2 items-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Both periods are set to <strong>{periodA}</strong>. Select different time windows to compare differentials.</span>
        </div>
      )}

      {error && !isSupabaseConfigured() && (
        <div className="flex gap-2 items-center text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-xl">
          <Calendar className="w-4 h-4 text-accent shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-900/40 border border-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-slate-900/40 border border-slate-800/60 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MetricCard label="Total reviews" keyA="totalReviews" keyB="totalReviews" />
            <MetricCard label="Avg score" keyA="avgScore" keyB="avgScore" />
            <MetricCard label="Highest score" keyA="avgScore" keyB="avgScore" />
            <MetricCard label="Top issue" keyA="topIssue" keyB="topIssue" isIssue />
            <MetricCard label="Improvement rate" keyA="improvementRate" keyB="improvementRate" isPercent />
          </div>

          {/* Comparison Line Chart */}
          <div className="bg-[#050507] border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">Normalized Review Scores by Index</span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00ffaa]" />
                  {periodA}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  {periodB}
                </div>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} 
                  />
                  <Line connectNulls={false} type="monotone" dataKey="a" stroke="#00ffaa" strokeWidth={2} dot={{ fill: '#00ffaa', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#00ffaa' }} />
                  <Line connectNulls={false} type="monotone" dataKey="b" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#38bdf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dimension Breakdown Table */}
          <div className="w-full bg-[#050507] border border-slate-800/80 rounded-xl p-4">
            <div className="flex border-b border-slate-800 pb-2.5 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
              <div className="flex-1">Dimension Vector</div>
              <div className="w-32 text-center text-[#00ffaa]">{periodA}</div>
              <div className="w-32 text-center text-[#38bdf8]">{periodB}</div>
            </div>
            {[
              { label: 'Readability Index', keyA: 'avgReadabilityScore', keyB: 'avgReadabilityScore' },
              { label: 'Complexity Control', keyA: 'avgComplexityScore', keyB: 'avgComplexityScore' },
              { label: 'Bug Risk Resistance', keyA: 'avgBugScore', keyB: 'avgBugScore' },
              { label: 'Security Hardening', keyA: 'avgSecurityScore', keyB: 'avgSecurityScore' },
            ].map((d, i) => {
              const valA = data.a?.[d.keyA as keyof PeriodData] as number;
              const valB = data.b?.[d.keyB as keyof PeriodData] as number;
              const winner = (valA === undefined || valB === undefined || valA === valB) ? null : valA > valB ? 'A' : 'B';
              return (
                <div key={i} className="flex items-center py-2.5 border-b border-slate-800/50 text-xs font-medium text-slate-300">
                  <div className="flex-1 font-sans">{d.label}</div>
                  <div className="w-32 flex items-center justify-center gap-2 font-mono text-[#00ffaa]">
                    {valA !== undefined ? valA : '—'}
                    {winner === 'A' && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                        ▲ Better
                      </span>
                    )}
                  </div>
                  <div className="w-32 flex items-center justify-center gap-2 font-mono text-[#38bdf8]">
                    {valB !== undefined ? valB : '—'}
                    {winner === 'B' && (
                      <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-bold">
                        ▲ Better
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
