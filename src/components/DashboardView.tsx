import React, { useMemo } from 'react';
import { CodeReview, DBUser, Streak } from '@/types';
import { 
  Flame, 
  ShieldCheck, 
  Bug, 
  Sparkles, 
  ArrowUpRight, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  TrendingUp,
  FileText,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';

interface DashboardViewProps {
  reviews: CodeReview[];
  streak: Streak;
  currentUser: DBUser | null;
  onGithubLogin: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
  onSelectReviewId?: (id: string | null) => void;
}

export default function DashboardView({ 
  reviews = [],
  streak,
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab,
  onSelectReviewId
}: DashboardViewProps) {

  // Aggregate Metrics
  const totalReviews = reviews.length;
  
  const avgOverallScore = useMemo(() => {
    if (totalReviews === 0) return 0;
    const total = reviews.reduce((acc, r) => acc + (r.overall_score || 0), 0);
    return Math.round(total / totalReviews);
  }, [reviews, totalReviews]);

  const totalIssuesDetected = useMemo(() => {
    return reviews.reduce((acc, r) => {
      const issues = r.feedback?.key_issues?.length || 0;
      return acc + issues;
    }, 0);
  }, [reviews]);

  const recentReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [reviews]);

  // Streak Milestone Calculations
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const nextMilestone = currentStreak < 3 ? 3 : currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : currentStreak < 30 ? 30 : currentStreak + 10;
  const milestoneProgress = Math.min(100, Math.round((currentStreak / nextMilestone) * 100));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const templates = [
    {
      title: 'SQL Injection Vulnerability',
      lang: 'JavaScript',
      desc: 'Test query parameter sanitization & dynamic SQL escaping.',
      icon: AlertTriangle,
      color: 'text-rose-400 border-rose-500/20 bg-rose-500/5'
    },
    {
      title: 'React Memory & Hook Leak',
      lang: 'TypeScript',
      desc: 'Audit stale closures, missing useEffect cleanups & deps.',
      icon: Zap,
      color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
    },
    {
      title: 'Mutable Default & Eval Risk',
      lang: 'Python',
      desc: 'Verify safe argument bounds & arbitrary code execution checks.',
      icon: ShieldCheck,
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    },
    {
      title: 'Concurrent Map Data Race',
      lang: 'Go',
      desc: 'Verify mutex locks & thread-safe read/write sync patterns.',
      icon: Code2,
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
    }
  ];

  const handleOpenReview = (id: string) => {
    if (onSelectReviewId) {
      onSelectReviewId(id);
    }
    onNavigateToTab('history');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome & Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0b0b0e] via-[#111117] to-[#0b0b0e] border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-accent/10 text-accent border border-accent/20 font-bold">
              AI Command Center
            </span>
            <span className="text-xs font-mono text-slate-500">
              Session: {currentUser?.github_username ? `@${currentUser.github_username}` : 'Local Developer'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back{currentUser?.github_username ? `, ${currentUser.github_username}` : ''}
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Continuous code intelligence workspace. Evaluate new pull requests, inspect security vectors, and maintain your code review streak.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          <button
            onClick={() => onNavigateToTab('new-review')}
            className="flex items-center gap-2 bg-accent text-bg px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-accent/10 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start New Audit
          </button>
          <button
            onClick={() => onNavigateToTab('progress')}
            className="flex items-center gap-2 bg-[#16161f] border border-slate-800 text-slate-200 px-4 py-3 rounded-xl text-xs font-semibold hover:border-slate-700 transition cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-accent" />
            Analytics
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Audits */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Audits</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-mono font-black text-white">{totalReviews}</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">100%</span> AST parsed
            </p>
          </div>
        </div>

        {/* Avg Quality Score */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Quality Score</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-white">{avgOverallScore}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {avgOverallScore >= 80 ? '🟢 Production Ready' : avgOverallScore >= 60 ? '🟡 Moderate Quality' : '🔴 Needs Attention'}
            </p>
          </div>
        </div>

        {/* Active Streak */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Review Streak</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4 animate-bounce" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-amber-400">{currentStreak}</span>
              <span className="text-xs text-slate-400">days active</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Personal record: <strong className="text-slate-300">{longestStreak} days</strong>
            </p>
          </div>
        </div>

        {/* Critical Issues Identified */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Issues Caught</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-mono font-black text-white">{totalIssuesDetected}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Security & bug defects flagged
            </p>
          </div>
        </div>

      </div>

      {/* Gamified Streak Milestone Banner */}
      <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Review Streak Challenge</h3>
              <p className="text-xs text-slate-400">Maintain daily code audits to unlock developer tier achievements</p>
            </div>
          </div>
          <div className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg font-bold">
            {currentStreak} / {nextMilestone} Days to Next Badge
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-[#050507] h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            <span>Current: {currentStreak}d</span>
            <span>Target Milestone: {nextMilestone}d</span>
          </div>
        </div>
      </div>

      {/* Quick-Launch Audit Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-base font-bold text-white tracking-tight">Quick-Launch Audit Templates</h2>
          </div>
          <span className="text-xs text-slate-500">Click to preload in editor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((tpl, i) => {
            const Icon = tpl.icon;
            return (
              <button
                key={i}
                onClick={() => onNavigateToTab('new-review')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-4 transition hover:scale-[1.02] cursor-pointer ${tpl.color}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-slate-300">
                      {tpl.lang}
                    </span>
                    <Icon className="w-4 h-4 opacity-80" />
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-tight mt-2">{tpl.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent mt-2">
                  <span>Audit Template</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Audits Table */}
      <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h3 className="text-base font-bold text-white tracking-tight">Recent Code Audits</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('history')}
            className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>View All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Code2 className="w-10 h-10 text-slate-600 animate-pulse" />
            <div className="text-sm font-bold text-slate-300">No Audits Performed Yet</div>
            <p className="text-xs text-slate-500 max-w-sm">
              Submit your first snippet or pull request diff in the editor to populate your intelligence history.
            </p>
            <button
              onClick={() => onNavigateToTab('new-review')}
              className="mt-2 bg-accent text-bg px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
            >
              Start First Review
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-850 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider pb-3">
                  <th className="pb-3 font-medium">Language</th>
                  <th className="pb-3 font-medium">Code Excerpt</th>
                  <th className="pb-3 font-medium text-center">Score</th>
                  <th className="pb-3 font-medium text-center">Defects</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentReviews.map((rev) => {
                  const scoreStyles = getScoreColor(rev.overall_score);
                  const firstLine = rev.code_snippet?.split('\n')[0]?.substring(0, 45) || 'Code snippet';
                  const dateStr = new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={rev.id} className="hover:bg-slate-900/40 transition group">
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#050507] border border-slate-800 text-slate-300">
                          {rev.language}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-400 group-hover:text-slate-200 transition truncate max-w-xs">
                        {firstLine}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${scoreStyles}`}>
                          {rev.overall_score}%
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="text-[11px] font-mono text-slate-400">
                          {rev.feedback?.key_issues?.length || 0}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 font-mono text-[10px]">
                        {dateStr}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleOpenReview(rev.id)}
                          className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          Inspect
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
