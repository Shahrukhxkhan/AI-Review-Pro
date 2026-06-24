import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell
} from 'recharts';
import { 
  Flame, 
  Code2, 
  ShieldCheck, 
  Bug, 
  Gauge, 
  BookOpen, 
  Terminal, 
  Github, 
  LogOut, 
  GitPullRequest, 
  Trophy,
  History,
  TrendingUp,
  Sparkles,
  Award,
  AlertTriangle
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
  currentUser,
  onGithubLogin,
  onLogout,
  onNavigateToTab 
}: DashboardViewProps) {
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // 1. Line chart data — overall score trend across last 30 reviews
  const last30LinesData = useMemo(() => {
    if (reviews.length === 0) return [];
    const sorted = [...reviews].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const sliced = sorted.slice(-30);
    return sliced.map((r, idx) => ({
      index: idx + 1,
      date: formatDate(r.created_at),
      Score: r.overall_score
    }));
  }, [reviews]);

  // 2. Radar chart — average scores across all 5 dimensions
  const averageDimensions = useMemo(() => {
    if (reviews.length === 0) {
      return [
        { subject: 'Bugs', score: 0, fullMark: 100 },
        { subject: 'Security', score: 0, fullMark: 100 },
        { subject: 'Readability', score: 0, fullMark: 100 },
        { subject: 'Complexity', score: 0, fullMark: 100 },
        { subject: 'Overall', score: 0, fullMark: 100 }
      ];
    }
    const sum = reviews.reduce((acc, r) => {
      acc.bug += r.bug_score;
      acc.security += r.security_score;
      acc.readability += r.readability_score;
      acc.complexity += r.complexity_score;
      acc.overall += r.overall_score;
      return acc;
    }, { bug: 0, security: 0, readability: 0, overall: 0, complexity: 0 });

    const total = reviews.length;
    return [
      { subject: 'Bug Free', score: Math.round(sum.bug / total), fullMark: 100 },
      { subject: 'Security Integrity', score: Math.round(sum.security / total), fullMark: 100 },
      { subject: 'Readability Style', score: Math.round(sum.readability / total), fullMark: 100 },
      { subject: 'Structure Simplicity', score: Math.round(sum.complexity / total), fullMark: 100 },
      { subject: 'Overall Rating', score: Math.round(sum.overall / total), fullMark: 100 }
    ];
  }, [reviews]);

  // 3. Bar chart — number of reviews per week for the past 8 weeks
  const weeklyData = useMemo(() => {
    const now = new Date();
    // 8 chronological weekly buckets from 8 weeks ago up to today
    const weeks = Array.from({ length: 8 }).map((_, i) => {
      const startOfBucket = new Date(now.getTime() - (8 - i) * 7 * 24 * 60 * 60 * 1000);
      const endOfBucket = new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000);
      
      let label = `${7 - i}w ago`;
      if (7 - i === 0) label = 'This Week';
      if (7 - i === 1) label = 'Last Week';

      return {
        label,
        start: startOfBucket,
        end: endOfBucket,
        count: 0
      };
    });

    reviews.forEach(r => {
      const reviewDate = new Date(r.created_at);
      const diffMs = now.getTime() - reviewDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 56) {
        const weekIndex = Math.floor(diffDays / 7); // 0 (this week) up to 7
        const bucketIndex = 7 - weekIndex;
        if (bucketIndex >= 0 && bucketIndex < 8) {
          weeks[bucketIndex].count++;
        }
      }
    });

    return weeks.map(w => ({
      name: w.label,
      "Reviews Count": w.count
    }));
  }, [reviews]);

  // 4. Stat cards calculations
  const statsSummary = useMemo(() => {
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageOverall: 0,
        currentStreak: streak?.current_streak || 0,
        mostCommonIssue: 'None'
      };
    }

    const totalReviews = reviews.length;
    const averageOverall = parseFloat((reviews.reduce((sum, r) => sum + r.overall_score, 0) / totalReviews).toFixed(1));

    // Calculate most common issue category
    const issueCounts: Record<string, number> = {};
    reviews.forEach(r => {
      const keyIssues = r.feedback?.key_issues || [];
      keyIssues.forEach(str => {
        const match = str.match(/^\[(.*?)\s*-\s*(.*?)\]/) || str.match(/^\[(.*?)\]/);
        if (match && match[1]) {
          const category = match[1].toUpperCase().trim();
          issueCounts[category] = (issueCounts[category] || 0) + 1;
        } else {
          const lower = str.toLowerCase();
          if (lower.includes('type') || lower.includes('any')) {
            issueCounts['TYPING'] = (issueCounts['TYPING'] || 0) + 1;
          } else if (lower.includes('concurrency') || lower.includes('race') || lower.includes('thread')) {
            issueCounts['CONCURRENCY'] = (issueCounts['CONCURRENCY'] || 0) + 1;
          } else if (lower.includes('sql') || lower.includes('inject') || lower.includes('security')) {
            issueCounts['SECURITY'] = (issueCounts['SECURITY'] || 0) + 1;
          } else if (lower.includes('performance') || lower.includes('nest') || lower.includes('loop')) {
            issueCounts['PERFORMANCE'] = (issueCounts['PERFORMANCE'] || 0) + 1;
          } else {
            issueCounts['BEST_PRACTICES'] = (issueCounts['BEST_PRACTICES'] || 0) + 1;
          }
        }
      });
    });

    let mostCommonKey = 'None';
    let maxCount = 0;
    Object.entries(issueCounts).forEach(([k, c]) => {
      if (c > maxCount) {
        maxCount = c;
        mostCommonKey = k;
      }
    });

    const labels: Record<string, string> = {
      'TYPING': 'Type Safety',
      'CONCURRENCY': 'Concurrency',
      'SECURITY': 'Security Leak',
      'PERFORMANCE': 'Performance Loop',
      'BEST_PRACTICES': 'Best Practices',
      'SQL': 'SQL Integrity',
      'COMPLEXITY': 'Code Complexity',
      'READABILITY': 'Readability'
    };

    return {
      totalReviews,
      averageOverall,
      currentStreak: streak?.current_streak || 0,
      mostCommonIssue: labels[mostCommonKey] || mostCommonKey
    };
  }, [reviews, streak]);

  // Overall Improvement Insight
  const improvementInsightPercent = useMemo(() => {
    if (reviews.length < 4) return null;

    const sorted = [...reviews].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const midpoint = Math.floor(sorted.length / 2);
    const earlyReviews = sorted.slice(0, midpoint);
    const recentReviews = sorted.slice(midpoint);

    const earlyAvg = earlyGroupAverage(earlyReviews);
    const recentAvg = earlyGroupAverage(recentReviews);

    if (recentAvg > earlyAvg) {
      const diffPercent = Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100);
      return diffPercent > 0 ? diffPercent : null;
    }
    return null;
  }, [reviews]);

  function earlyGroupAverage(revs: CodeReview[]) {
    if (revs.length === 0) return 0;
    return revs.reduce((sum, r) => sum + r.overall_score, 0) / revs.length;
  }

  // Filter local evaluations stream at the bottom
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchLanguage = selectedLanguage === 'All' || r.language === selectedLanguage;
      const matchSearch = r.code_snippet.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.feedback.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLanguage && matchSearch;
    });
  }, [reviews, selectedLanguage, searchQuery]);

  // Unique languages for filtering dropdown
  const languages = useMemo(() => {
    return ['All', ...Array.from(new Set(reviews.map(r => r.language)))];
  }, [reviews]);

  // Is user's streak maintained today?
  const reviewedToday = useMemo(() => {
    if (!streak || !streak.last_reviewed_at) return false;
    const lastRevDay = new Date(streak.last_reviewed_at).toDateString();
    const today = new Date().toDateString();
    return lastRevDay === today;
  }, [streak]);

  // Milestone Badges logic (Requirement check)
  const milestoneBadges = useMemo(() => {
    const totalReviews = reviews.length;
    const maxStreak = Math.max(streak?.current_streak || 0, streak?.longest_streak || 0);
    const hasPerfectScore = reviews.some(r => r.overall_score === 100);
    const highestScore = reviews.length > 0 ? Math.max(...reviews.map(r => r.overall_score)) : 0;

    return [
      {
        id: 'badge-first-review',
        name: 'First Review',
        description: 'Analyzed your first code snippet of any complexity.',
        unlocked: totalReviews >= 1,
        progressText: `${Math.min(totalReviews, 1)}/1`,
        progressPercent: totalReviews >= 1 ? 100 : 0,
        icon: Code2,
        colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        glowClass: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]',
        colorName: 'indigo'
      },
      {
        id: 'badge-7-day-streak',
        name: '7-Day Streak',
        description: 'Maintained a consecutive review stream for 7 code cycles.',
        unlocked: maxStreak >= 7,
        progressText: `${Math.min(maxStreak, 7)}/7`,
        progressPercent: Math.round((Math.min(maxStreak, 7) / 7) * 100),
        icon: Flame,
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        glowClass: 'shadow-[0_0_15px_rgba(242,158,12,0.25)]',
        colorName: 'amber'
      },
      {
        id: 'badge-30-reviews',
        name: '30 Reviews',
        description: 'Fully completed 30 rigorous AI check-in evaluations.',
        unlocked: totalReviews >= 30,
        progressText: `${Math.min(totalReviews, 30)}/30`,
        progressPercent: Math.round((Math.min(totalReviews, 30) / 30) * 100),
        icon: Trophy,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
        colorName: 'emerald'
      },
      {
        id: 'badge-perfect-score',
        name: 'Perfect Score',
        description: 'Received a flawless 100% composite rating score!',
        unlocked: hasPerfectScore,
        progressText: hasPerfectScore ? '100/100' : `${highestScore}/100`,
        progressPercent: highestScore,
        icon: Sparkles,
        colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        glowClass: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]',
        colorName: 'purple'
      }
    ];
  }, [reviews, streak]);

  return (
    <div id="code-dashboard-view" className="space-y-8 animate-fade-in font-sans">
      
      {/* "Keep your streak alive!" Banner (Requirement check) */}
      {!reviewedToday && (
        <div id="streak-warning-banner" className="bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-slate-900/40 p-4 sm:p-5 rounded-2.5xl border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.12)] relative overflow-hidden transition duration-300">
          <div className="absolute top-0 right-0 w-80 h-32 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl animate-pulse">
              <Flame className="h-5 w-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight">
                Keep your streak alive! 🔥
              </h3>
              <p className="text-slate-300 text-xs mt-0.5">
                You haven't completed a code review today. Submit a review now to secure your active <span className="text-amber-400 font-bold">{streak?.current_streak || 0}-day streak</span>!
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('new-review')}
            className="text-[10px] uppercase tracking-wider font-extrabold text-white bg-amber-600 hover:bg-amber-500 px-4.5 py-2.5 rounded-xl border border-amber-500/10 transition shadow-inner select-none cursor-pointer text-center sm:w-auto"
          >
            Review Code Now
          </button>
        </div>
      )}

      {/* Dynamic Score Improvement Insight Banner */}
      {improvementInsightPercent && (
        <div id="dashboard-insight-banner" className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/40 p-4 sm:p-5 rounded-2.5xl border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden transition duration-300">
          <div className="absolute top-0 right-0 w-80 h-32 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight">
                Code Quality Metric Alert
              </h3>
              <p className="text-slate-350 text-xs mt-0.5">
                Your code quality has improved <span className="text-indigo-400 font-bold">{improvementInsightPercent}%</span> this month! Keep up the momentum.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('new-review')}
            className="text-[10px] uppercase tracking-wider font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl border border-indigo-500/10 transition shadow-inner select-none cursor-pointer text-center sm:w-auto"
          >
            Start New Review
          </button>
        </div>
      )}

      {/* Visual Header / GitHub Auth Hero Control Banner */}
      <div id="github-hero-panel" className="bg-[#0a0a0c] rounded-2.5xl border border-slate-800/85 p-6 md:p-8 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                Gamified Code Review Workspace
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                <Sparkles className="h-3 w-3 animate-pulse" />
                AI Reviewed
              </span>
            </div>
            
            {currentUser ? (
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
                  Welcome back, <span className="text-indigo-400">@{currentUser.github_username}</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Keep active on your code-analysis dashboard, resolve bug warnings, and increase your review chain streak!
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  Welcome to AI-Review Pro
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Simulating offline test environment. Connect with GitHub to activate personal database syncing.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentUser && currentUser.id !== 'local_user' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="bg-[#111114] px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <div className="bg-slate-850 p-1.5 rounded-lg border border-slate-700">
                    <Github className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Linked Account</p>
                    <p className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  id="btn-github-logout"
                  onClick={onLogout}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
                <button
                  id="btn-github-auth"
                  onClick={onGithubLogin}
                  className="bg-white hover:bg-slate-100 text-[#09090b] px-6 py-3.5 rounded-xl text-sm font-black tracking-wide transition shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Github className="h-5 w-5" />
                  <span>Connect GitHub OAuth</span>
                </button>
                <div className="text-slate-500 text-[10px] font-bold font-mono uppercase tracking-widest text-center self-center bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  ⚡ OFFLINE fallback sandbox Active
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 4 Dynamic Stat Cards (Requirement 4) */}
      <div id="stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Reviews */}
        <div id="stat-total-reviews" className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:border-slate-700/60 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Total Reviews</span>
            <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black text-white font-sans tracking-tight">{statsSummary.totalReviews}</span>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1.5">Completed Analyses</p>
          </div>
          <p className="text-[10px] text-slate-655 font-bold font-mono uppercase tracking-wide">Across all language dialects</p>
        </div>

        {/* Card 2: Average Overall Score */}
        <div id="stat-average-score" className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:border-slate-700/60 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Average Score</span>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Gauge className="h-4 w-4" />
            </div>
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white font-sans tracking-tight">{statsSummary.averageOverall}</span>
              <span className="text-slate-500 text-xs font-bold font-mono">/ 100</span>
            </div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1.5">Composite quality rating</p>
          </div>
          <p className="text-[10px] text-indigo-400 font-bold font-mono uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Top 15% Quality standards
          </p>
        </div>

        {/* Card 3: Current Streak */}
        <div id="stat-current-streak" className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:border-slate-700/60 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Active Streak</span>
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500 border border-amber-500/20">
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black text-white font-sans tracking-tight">{statsSummary.currentStreak}</span>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1.5">Consecutive Active Days</p>
          </div>
          <p className="text-[10px] text-amber-400 font-bold font-mono uppercase tracking-wide flex items-center gap-1">
            <Award className="h-3 w-3" />
            Streaking reward active
          </p>
        </div>

        {/* Card 4: Most Common Issue Type */}
        <div id="stat-common-issue" className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:border-slate-700/60 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Primary Concern</span>
            <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-450 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-2xl font-black text-white font-sans tracking-tight truncate block" title={statsSummary.mostCommonIssue}>
              {statsSummary.mostCommonIssue}
            </span>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-3">Most Common warning</p>
          </div>
          <p className="text-[10px] text-slate-655 font-bold font-mono uppercase tracking-wide">Derived from static lint issues</p>
        </div>

      </div>

      {/* Milestone Achievements Bento Card Row (Requirement check) */}
      <div id="milestones-achievements-container" className="bg-[#0a0a0c] p-6 rounded-2.5xl border border-slate-800/80 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4 mb-6 relative z-10">
          <div>
            <h3 className="text-white font-extrabold text-lg tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-400" />
              <span>Developer Achievements & Milestone Badges</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">Complete daily reviews and gain score milestones to unlock achievements</p>
          </div>
          <span className="text-[10px] uppercase font-bold font-mono tracking-widest bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded text-indigo-400 self-start sm:self-center">
            {milestoneBadges.filter(b => b.unlocked).length} / {milestoneBadges.length} Unlocked
          </span>
        </div>

        <div id="milestone-badges-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
          {milestoneBadges.map((badge) => {
            const BadgeIcon = badge.icon;
            
            return (
              <div 
                id={badge.id}
                key={badge.id}
                className={`p-5 rounded-2xl border transition duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]
                  ${badge.unlocked 
                    ? 'bg-[#111114]/60 border-slate-800/80 ' + badge.glowClass
                    : 'bg-[#08080a] border-slate-900/60 opacity-60'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${badge.colorClass} ${badge.unlocked ? 'animate-pulse' : 'grayscale text-slate-655'}`}>
                      <BadgeIcon className="h-5 w-5" />
                    </div>
                    {badge.unlocked ? (
                      <span className={`text-[9px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-md leading-none
                        ${badge.id === 'badge-first-review' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : ''}
                        ${badge.id === 'badge-7-day-streak' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : ''}
                        ${badge.id === 'badge-30-reviews' ? 'bg-emerald-500/10 text-emerald-405 border border-emerald-500/20' : ''}
                        ${badge.id === 'badge-perfect-score' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : ''}
                      `}>
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-md leading-none bg-slate-850 text-slate-500 border border-slate-800">
                        Locked
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className={`text-sm font-extrabold tracking-tight ${badge.unlocked ? 'text-white' : 'text-slate-500'}`}>
                      {badge.name}
                    </h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Achievement Progress Bar Indicator */}
                <div className="mt-4 pt-3 border-t border-slate-850/50 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold font-mono uppercase tracking-wider">
                    <span className="text-slate-500">Progress</span>
                    <span className={`
                      ${badge.unlocked
                        ? (badge.id === 'badge-first-review' ? 'text-indigo-400' :
                           badge.id === 'badge-7-day-streak' ? 'text-amber-400' :
                           badge.id === 'badge-30-reviews' ? 'text-emerald-400' :
                           'text-purple-400')
                        : 'text-slate-500'
                      }
                    `}>
                      {badge.progressText}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full transition-all duration-550 rounded-full
                        ${badge.unlocked 
                          ? (badge.id === 'badge-first-review' ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' :
                             badge.id === 'badge-7-day-streak' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                             badge.id === 'badge-30-reviews' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                             'bg-gradient-to-r from-purple-500 to-purple-400')
                          : 'bg-slate-850'
                        }`}
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Charts Section: Bento Row (Requirement 1 & 2) */}
      <div id="charts-grid-row" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Line chart — overall score trend across last 30 reviews */}
        <div id="trend-line-graph-card" className="lg:col-span-3 bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.35)] flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-white font-extrabold text-base tracking-tight flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-indigo-400" />
              <span>Overall Quality Trend (Last 30 Reviews)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold uppercase font-mono">Historical performance and evolution analysis</p>
          </div>

          <div className="h-72 mt-6">
            {last30LinesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-semibold font-mono">
                No telemetry generated yet. Run code evaluations to trace lines.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30LinesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0c', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Score" 
                    name="Score Points"
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ fill: '#6366f1', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Radar chart — average scores across all 5 dimensions */}
        <div id="radar-dimension-graph-card" className="lg:col-span-2 bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.35)] flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-white font-extrabold text-base tracking-tight flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-400" />
              <span>Dimension Averages (Radar Map)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold uppercase font-mono">Normalized scores across 5 developer guidelines</p>
          </div>

          <div className="h-72 mt-4 flex items-center justify-center">
            {reviews.length === 0 ? (
              <div className="text-slate-650 text-xs font-semibold font-mono">
                Needs reviews to construct radar mapping.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={averageDimensions}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                  <Radar 
                    name="Skill Score" 
                    dataKey="score" 
                    stroke="#a855f7" 
                    fill="#a855f7" 
                    fillOpacity={0.25} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0c', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Weekly Activity Bar Chart & Logs Stream (Requirement 3 & Streams) */}
      <div id="secondary-grid-row" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Card: Bar chart — number of reviews per week for the past 8 weeks */}
        <div id="weekly-bar-graph-card" className="lg:col-span-3 bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.355)] flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-white font-extrabold text-base tracking-tight flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              <span>Weekly Analysis Activity (Past 8 Weeks)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold uppercase font-mono">Total checkins count grouped into 7-day intervals</p>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0c', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar 
                  dataKey="Reviews Count" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                >
                  {weeklyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 7 ? '#34d399' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Filterable and Searchable Code Evaluations Stream list */}
        <div id="submissions-panel-card" className="lg:col-span-2 bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.35)] flex flex-col justify-between min-h-[320px]">
          
          <div className="space-y-3">
            <div className="space-y-1 border-b border-slate-850 pb-3">
              <h3 className="text-white font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                <span>Select Evaluations</span>
              </h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider font-mono">Recent run indicators</p>
            </div>

            {/* Language filter dropdown & Search */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                id="sidebar-lang-filter"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#050507] border border-slate-800 text-slate-350 rounded-lg px-2.5 py-1.5 text-[10px] focus:ring-1 focus:ring-indigo-505 focus:border-indigo-505 cursor-pointer max-w-full font-mono font-bold"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang} className="bg-[#050507] text-white">
                    {lang === 'All' ? 'Langs: All' : lang}
                  </option>
                ))}
              </select>
              <input
                id="sidebar-search-input"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#050507] border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-350 placeholder:text-slate-600 font-bold"
              />
            </div>

            {/* Evaluations lists */}
            <div className="space-y-2 mt-4 max-h-48 overflow-y-auto scrollbar-thin">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-6 text-slate-600 text-[10px] font-bold font-mono uppercase tracking-wider border border-dashed border-slate-850 rounded-xl bg-[#050507]/20">
                  No submissions.
                </div>
              ) : (
                filteredReviews.slice(0, 3).map((r) => {
                  const scoreColor = r.overall_score >= 80 ? 'text-emerald-450 bg-emerald-505/5 border-emerald-505/10' : 
                                     r.overall_score >= 60 ? 'text-amber-400 bg-amber-505/5 border-amber-505/10' : 
                                     'text-rose-455 bg-rose-505/5 border-rose-505/10';

                  return (
                    <div 
                      id={`sidebar-eval-${r.id}`}
                      key={r.id} 
                      className="bg-[#050507] p-2.5 rounded-lg border border-slate-850 hover:border-slate-800 transition duration-200 flex items-center justify-between gap-1.5"
                    >
                      <div className="min-w-0 pr-1">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded leading-none">
                          {r.language}
                        </span>
                        <p className="text-slate-400 text-[10px] italic truncate mt-1">
                          "{r.feedback?.summary}"
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`px-2 py-1 rounded font-mono text-[10px] font-black border ${scoreColor}`}>
                          {r.overall_score}
                        </div>
                        <button
                          onClick={() => onNavigateToTab('history')}
                          className="text-[9px] font-bold text-slate-500 hover:text-white transition cursor-pointer bg-slate-900 border border-slate-800 rounded px-1.5 py-1"
                        >
                          Logs
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          <div className="border-t border-slate-850 pt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-3">
            Track key warnings to resolve metrics
          </div>

        </div>

      </div>

    </div>
  );
}
