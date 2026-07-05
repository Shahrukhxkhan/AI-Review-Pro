
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { getDateRange } from '@/lib/dateUtils';
import { fetchPeriodData, PeriodData } from '@/lib/periodData';
import { DBUser } from '@/types';

interface ComparisonViewProps {
  currentUser: DBUser | null;
}

const PERIODS = ['This week', 'Last week', 'This month', 'Last month', 'Last 3 months'];

export default function ComparisonView({ currentUser }: ComparisonViewProps) {
  const [periodA, setPeriodA] = useState('Last week');
  const [periodB, setPeriodB] = useState('This week');
  const [data, setData] = useState<{ a: PeriodData | null, b: PeriodData | null }>({ a: null, b: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      setLoading(true);
      const rangeA = getDateRange(periodA);
      const rangeB = getDateRange(periodB);
      
      try {
        const [resA, resB] = await Promise.all([
          fetchPeriodData(currentUser.id, rangeA.start, rangeA.end),
          fetchPeriodData(currentUser.id, rangeB.start, rangeB.end)
        ]);
        setData({ a: resA, b: resB });
      } catch (e) {
        console.error('Error fetching period data:', e);
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
    
    if (loading) return <div className="h-[70px] w-full bg-[#f4f6f8] rounded-[8px]"></div>;

    let delta = 0;
    if (!isIssue && typeof valA === 'number' && typeof valB === 'number') delta = valB - valA;

    return (
        <div className="bg-[#f4f6f8] border-[0.5px] border-[#e0e5eb] rounded-[8px] p-[14px]">
            <div className="text-[10px] uppercase text-[#8a9ab0] mb-[10px] tracking-wide">{label}</div>
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#1D9E75]"><div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]"/>{valA}{isPercent ? '%' : ''}</div>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#378ADD]"><div className="w-1.5 h-1.5 rounded-full bg-[#378ADD]"/>{valB}{isPercent ? '%' : ''}</div>
            </div>
            {!isIssue && (
                <div className={`text-[10px] mt-[6px] ${delta > 0 ? 'text-[#1D9E75]' : delta < 0 ? 'text-[#993C1D]' : 'text-[#8a9ab0]'}`}>
                    {delta > 0 ? `▲ +${delta.toFixed(1)}` : delta < 0 ? `▼ ${Math.abs(delta).toFixed(1)}` : '— No change'}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="bg-white border border-[#e0e5eb] rounded-[12px] p-[20px]">
        <h2 className="text-[13px] font-medium text-[#1a2332]">Period comparison</h2>
        <p className="text-[11px] text-[#b0bcc8] mb-[20px]">Compare your performance across two time periods</p>

        <div className="flex gap-[12px] mb-[24px]">
            {[{ label: 'Period A', val: periodA, set: setPeriodA, color: '#1D9E75' }, { label: 'Period B', val: periodB, set: setPeriodB, color: '#378ADD' }].map(p => (
                <div key={p.label}>
                    <div className="text-[10px] uppercase text-[#8a9ab0] mb-[6px] tracking-wide">{p.label}</div>
                    <select value={p.val} onChange={(e) => p.set(e.target.value)} className="bg-[#f4f6f8] border-[0.5px] border-[#e0e5eb] rounded-[8px] p-[8px_12px] text-[12px] text-[#1a2332] w-[160px]" style={{ borderLeft: `3px solid ${p.color}` }}>
                        {PERIODS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            ))}
        </div>

        {periodA === periodB && (
            <div className="flex gap-2 items-center text-[11px] text-[#BA7517] mb-4">
                <AlertTriangle className="w-3.5 h-3.5" /> Both periods are the same — select different periods to compare
            </div>
        )}

        {loading ? (
            <div className="space-y-4">
                <div className="grid grid-cols-5 gap-[10px]">{Array.from({length: 5}).map((_, i) => <div key={i} className="h-[70px] bg-[#f4f6f8] rounded-[8px]"></div>)}</div>
                <div className="h-[220px] bg-[#f4f6f8] rounded-[8px]"></div>
                {Array.from({length: 5}).map((_, i) => <div key={i} className="h-[36px] bg-[#f4f6f8] rounded-[8px]"></div>)}
            </div>
        ) : (
            <>
                <div className="grid grid-cols-5 gap-[10px] mb-6">
                    <MetricCard label="Total reviews" keyA="totalReviews" keyB="totalReviews" />
                    <MetricCard label="Avg score" keyA="avgScore" keyB="avgScore" />
                    <MetricCard label="Best score" keyA="avgScore" keyB="avgScore" /> {/* Placeholder for Best, using Avg as proxy for demo */}
                    <MetricCard label="Top issue" keyA="topIssue" keyB="topIssue" isIssue />
                    <MetricCard label="Improvement rate" keyA="improvementRate" keyB="improvementRate" isPercent />
                </div>

                <div className="h-[220px] mb-6">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={mergedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e5eb" vertical={false} />
                            <XAxis dataKey="index" label={{ value: 'Review #', position: 'insideBottom', fontSize: 11, fill: '#8a9ab0', offset: -5 }} tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#8a9ab0' }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2735', color: '#e8edf3', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Line connectNulls={false} type="monotone" dataKey="a" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#1D9E75', strokeWidth: 0 }} />
                            <Line connectNulls={false} type="monotone" dataKey="b" stroke="#378ADD" strokeWidth={2} strokeDasharray="5 4" dot={{ fill: '#378ADD', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#378ADD', strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2">
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8a9ab0]"><div className="w-2 h-2 rounded-full bg-[#1D9E75]"/>{periodA}</div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8a9ab0]"><div className="w-2 h-2 rounded-full bg-[#378ADD]"/>{periodB}</div>
                    </div>
                </div>

                <div className="w-full">
                    <div className="flex border-b border-[#e0e5eb] pb-2 mb-2 text-[11px] uppercase tracking-wider text-[#8a9ab0]">
                        <div className="w-[120px]">Dimension</div>
                        <div className="w-[80px]">Period A</div>
                        <div className="w-[80px]">Period B</div>
                    </div>
                    {[
                        { label: 'Readability', keyA: 'avgReadabilityScore', keyB: 'avgReadabilityScore' },
                        { label: 'Complexity', keyA: 'avgComplexityScore', keyB: 'avgComplexityScore' },
                        { label: 'Bug risk', keyA: 'avgBugScore', keyB: 'avgBugScore' },
                        { label: 'Security', keyA: 'avgSecurityScore', keyB: 'avgSecurityScore' },
                    ].map((d, i) => {
                        const valA = data.a?.[d.keyA as keyof PeriodData] as number;
                        const valB = data.b?.[d.keyB as keyof PeriodData] as number;
                        const winner = valA === valB ? null : valA > valB ? 'A' : 'B';
                        return (
                            <div key={i} className="flex items-center py-2 border-b border-[#e0e5eb] text-[12px] font-medium text-[#1a2332]">
                                <div className="w-[120px]">{d.label}</div>
                                <div className="w-[80px] text-[#1D9E75] flex gap-2">
                                    {valA} {winner === 'A' && <span className="text-[9px] bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#9FE1CB] px-1.5 rounded-[3px]">↑ Better</span>}
                                </div>
                                <div className="w-[80px] text-[#378ADD] flex gap-2">
                                    {valB} {winner === 'B' && <span className="text-[9px] bg-[#E6F1FB] text-[#0C447C] border-[0.5px] border-[#B5D4F4] px-1.5 rounded-[3px]">↑ Better</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        )}
    </div>
  );
}
