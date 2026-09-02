import React, { useState, useEffect, useMemo } from 'react';
import { Report, CodeReview } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateReport } from '@/lib/reports';
import { useUser } from '@/hooks/useUser';
import { useReports } from '@/hooks/useReports';
import { exportReportToPdf, exportReportToMarkdown } from '@/lib/export';
import { loadFromLocal, saveToLocal, SEED_REVIEWS } from '@/lib/utils';
import { 
  FileText, 
  Plus, 
  Download, 
  Calendar, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  BarChart2, 
  FileDown, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

export default function ReportsView() {
  const { user } = useUser();
  const { reports: remoteReports, isLoading: isRemoteLoading, fetchReports } = useReports(user?.id);
  const [localReports, setLocalReports] = useState<Report[]>(() => {
    return loadFromLocal<Report[]>('gamified_reports', [
      {
        id: 'rep-seed-01',
        user_id: 'local_user',
        type: 'weekly',
        start_date: new Date(Date.now() - 7 * 86400000).toISOString(),
        end_date: new Date().toISOString(),
        reviews_completed: 6,
        average_score: 84.5,
        most_common_issue: 'Missing error boundary & validation',
        improvement_percentage: 5.2,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'rep-seed-02',
        user_id: 'local_user',
        type: 'monthly',
        start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
        end_date: new Date().toISOString(),
        reviews_completed: 18,
        average_score: 81.0,
        most_common_issue: 'Unescaped SQL query strings',
        improvement_percentage: 12.0,
        created_at: new Date(Date.now() - 7 * 86400000).toISOString()
      }
    ]);
  });
  
  const [generating, setGenerating] = useState(false);
  const isSupabaseReady = isSupabaseConfigured() && user && user.id !== 'local_user';

  // Merge or select reports based on connectivity
  const reports: Report[] = useMemo(() => {
    if (isSupabaseReady && remoteReports.length > 0) {
      return remoteReports as unknown as Report[];
    }
    return localReports;
  }, [isSupabaseReady, remoteReports, localReports]);

  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    setGenerating(true);
    try {
      const supabase = getSupabase();
      let reviewsData: CodeReview[] = [];

      if (isSupabaseReady && supabase) {
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id);
        reviewsData = (data as CodeReview[]) || [];
      } else {
        reviewsData = loadFromLocal<CodeReview[]>('gamified_code_reviews', SEED_REVIEWS);
      }

      if (isSupabaseReady && supabase && user) {
        await generateReport(user.id, reviewsData, type);
        await fetchReports();
      } else {
        // Local generation fallback
        const reviewsCompleted = reviewsData.length;
        const avg = reviewsCompleted > 0 
          ? reviewsData.reduce((acc, r) => acc + r.overall_score, 0) / reviewsCompleted 
          : 85;

        // Detect most common issue
        const issueCounts: Record<string, number> = {};
        reviewsData.forEach(r => {
          r.feedback?.key_issues?.forEach(issue => {
            issueCounts[issue] = (issueCounts[issue] || 0) + 1;
          });
        });

        let topIssue = 'Variable shadowing';
        let maxCount = 0;
        for (const k in issueCounts) {
          if (issueCounts[k] > maxCount) {
            maxCount = issueCounts[k];
            topIssue = k;
          }
        }

        const newReport: Report = {
          id: `rep-${Date.now()}`,
          user_id: user?.id || 'local_user',
          type,
          start_date: new Date(Date.now() - (type === 'weekly' ? 7 : 30) * 86400000).toISOString(),
          end_date: new Date().toISOString(),
          reviews_completed: reviewsCompleted,
          average_score: Math.round(avg * 10) / 10,
          most_common_issue: topIssue,
          improvement_percentage: +(Math.random() * 8 + 2).toFixed(1),
          created_at: new Date().toISOString()
        };

        const updated = [newReport, ...localReports];
        setLocalReports(updated);
        saveToLocal('gamified_reports', updated);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return [...reports]
      .reverse()
      .map(r => ({
        name: `${r.type.toUpperCase()} (${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
        score: Number(r.average_score) || 0,
        reviews: r.reviews_completed
      }));
  }, [reports]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Generation CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b0b0e] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-black text-white tracking-tight">Periodic Performance Audits</h2>
          </div>
          <p className="text-xs text-slate-400">
            Synthesize team code health, recurrence of vulnerabilities, and quality improvement over rolling cycles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            disabled={generating}
            onClick={() => handleGenerateReport('weekly')} 
            className="bg-accent text-bg px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition flex items-center gap-2 shadow-lg shadow-accent/10 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Weekly</span>
          </button>
          
          <button 
            disabled={generating}
            onClick={() => handleGenerateReport('monthly')} 
            className="bg-[#16161f] border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-slate-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Monthly</span>
          </button>
        </div>
      </div>

      {/* Trajectory Comparison Chart */}
      {chartData.length > 0 && (
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-accent" />
              Historical Audit Quality Scores Across Cycles
            </span>
            <span className="text-[10px] font-mono text-slate-500">Average % per Report</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} 
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={28}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.score >= 80 ? '#00ffaa' : entry.score >= 65 ? '#38bdf8' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Reports Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Archived Audit Reports ({reports.length})
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Reports Generated Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;Generate Weekly&quot; or &quot;Generate Monthly&quot; above to aggregate your team&apos;s code reviews.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const isWeekly = report.type === 'weekly';
              const badgeStyle = isWeekly 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
              const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div 
                  key={report.id} 
                  className="bg-[#0b0b0e] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-6 shadow-xl space-y-5 transition flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    
                    {/* Top Row: Type & Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${badgeStyle}`}>
                          {report.type} Audit
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {report.id.substring(0, 12)}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Stats Highlights */}
                    <div className="grid grid-cols-3 gap-2 bg-[#050507] p-3 rounded-xl border border-slate-800/60 text-center">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Audits</span>
                        <span className="font-mono text-sm font-bold text-white">{report.reviews_completed}</span>
                      </div>
                      <div className="border-x border-slate-800/80">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Avg Score</span>
                        <span className={`font-mono text-sm font-bold ${Number(report.average_score) >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {Number(report.average_score).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Growth</span>
                        <span className="font-mono text-sm font-bold text-accent">
                          {report.improvement_percentage >= 0 ? '+' : ''}{Number(report.improvement_percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Common Issue Vector */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        Most Recurrent Defect
                      </span>
                      <p className="text-xs text-slate-300 font-sans line-clamp-1 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                        {report.most_common_issue || 'None reported'}
                      </p>
                    </div>

                  </div>

                  {/* Export Actions */}
                  <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      Export Summary
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportReportToPdf(report, `audit-report-${report.type}-${report.id.substring(0, 8)}`)}
                        className="px-3 py-1.5 rounded-lg bg-[#16161f] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 text-rose-400" />
                        PDF
                      </button>
                      <button
                        onClick={() => exportReportToMarkdown(report, `audit-report-${report.type}-${report.id.substring(0, 8)}`)}
                        className="px-3 py-1.5 rounded-lg bg-[#16161f] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-accent" />
                        Markdown
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
