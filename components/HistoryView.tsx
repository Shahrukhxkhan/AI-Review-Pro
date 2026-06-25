import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Bug, 
  BookOpen, 
  Terminal, 
  Sparkles,
  Eye,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  Frown,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { CodeReview } from '@/types';
import { formatDate } from '@/lib/utils';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import ReviewResult from './ReviewResult';
import { exportToJson, exportToMarkdown, exportToPdf } from '@/lib/export';

interface HistoryViewProps {
  reviews?: CodeReview[];
  onDeleteReview?: (id: string) => void;
  selectedReviewId?: string | null;
  onSelectReviewId?: (id: string | null) => void;
}

export default function HistoryView({ 
  reviews: propReviews = [], 
  onDeleteReview,
  selectedReviewId,
  onSelectReviewId
}: HistoryViewProps) {
  // Authentication & Supabase
  const { user: currentUser } = useUser();
  const isSupabaseConnected = isSupabaseConfigured();
  const supabase = getSupabase();

  // Internal reviews collection
  const [reviews, setReviews] = useState<CodeReview[]>(propReviews);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [scoreFilter, setScoreFilter] = useState<string>('All'); // 'All' | 'poor' | 'average' | 'good'
  const [sortBy, setSortBy] = useState<string>('Date: Newest');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('All');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Selected review for the detailed Modal Overlay
  const [activeReview, setActiveReview] = useState<CodeReview | null>(null);

  // Synchronization with selectedReviewId prop
  useEffect(() => {
    if (selectedReviewId && reviews.length > 0) {
      const found = reviews.find(r => r.id === selectedReviewId);
      if (found) {
        setActiveReview(found);
      }
    } else if (!selectedReviewId) {
      setActiveReview(null);
    }
  }, [selectedReviewId, reviews]);

  const handleViewReview = (r: CodeReview) => {
    setActiveReview(r);
    if (onSelectReviewId) {
      onSelectReviewId(r.id);
    }
  };

  const handleCloseReview = () => {
    setActiveReview(null);
    if (onSelectReviewId) {
      onSelectReviewId(null);
    }
  };

  // Safety trigger for deletions
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch reviews directly from Supabase ordered by created_at DESC
  const fetchReviewsFromSupabase = async () => {
    if (!isSupabaseConnected || !supabase || !currentUser || currentUser.id === 'local_user') {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      if (data) {
        setReviews(data as CodeReview[]);
      }
    } catch (err: any) {
      console.error('Failure fetching reviews:', err);
      setError('Could not fetch historical checkins from remote repository.');
    } finally {
      setLoading(false);
    }
  };

  // Synchronize on load or user change
  useEffect(() => {
    if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
      fetchReviewsFromSupabase();
    } else {
      setReviews(propReviews);
    }
  }, [currentUser, isSupabaseConnected, propReviews]);

  // Compute unique languages based on all reviews
  const uniqueLanguages = useMemo(() => {
    const list = new Set<string>();
    reviews.forEach(r => {
      if (r.language) list.add(r.language);
    });
    return ['All', ...Array.from(list)];
  }, [reviews]);

  // Handle local deletion and coordinate database purge
  const handleDelete = async (id: string) => {
    try {
      if (isSupabaseConnected && supabase && currentUser && currentUser.id !== 'local_user') {
        const { error: delErr } = await supabase
          .from('reviews')
          .delete()
          .eq('id', id);
        
        if (delErr) {
          throw delErr;
        }
      }
      
      // Update local view state
      setReviews(prev => prev.filter(r => r.id !== id));
      
      // Bubble to parent if callback defined
      if (onDeleteReview) {
        onDeleteReview(id);
      }

      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to purge review:', err);
      alert('Error: Was unable to delete this review.');
    }
  };

  // Filter logic: search, language, score category, date range, and sorting
  const filteredReviews = useMemo(() => {
    let result = [...reviews].filter(r => {
      // 1. Language constraint matching
      const matchLanguage = languageFilter === 'All' || r.language === languageFilter;

      // 2. Score category: poor (< 50), average (50 to 75), good (> 75)
      let matchScore = true;
      const score = r.overall_score || 0;
      if (scoreFilter === 'poor') {
        matchScore = score < 50;
      } else if (scoreFilter === 'average') {
        matchScore = score >= 50 && score <= 75;
      } else if (scoreFilter === 'good') {
        matchScore = score > 75;
      }

      // 3. Date range filtering
      let matchDate = true;
      if (dateRangeFilter !== 'All') {
        const reviewDate = new Date(r.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === 'Last 7 Days') {
          matchDate = diffDays <= 7;
        } else if (dateRangeFilter === 'Last 30 Days') {
          matchDate = diffDays <= 30;
        }
      }

      // 4. Search substring lookup
      const summaryText = r.feedback?.summary || r.summary || '';
      const matchSearch = r.code_snippet.toLowerCase().includes(search.toLowerCase()) ||
                          r.language.toLowerCase().includes(search.toLowerCase()) ||
                          summaryText.toLowerCase().includes(search.toLowerCase());

      return matchLanguage && matchScore && matchDate && matchSearch;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'Date: Newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'Date: Oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'Score: High') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'Score: Low') return (a.overall_score || 0) - (b.overall_score || 0);
      return 0;
    });

    return result;
  }, [reviews, search, languageFilter, scoreFilter, sortBy, dateRangeFilter]);

  // Get current paginated list chunk
  const paginatedReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleCount);
  }, [filteredReviews, visibleCount]);

  // Check if there are more reviews to load
  const hasMore = filteredReviews.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  return (
    <div id="code-history-view" className="space-y-6 animate-fade-in font-sans">
      
      {/* Header bar and reload triggers */}
      <div id="history-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Terminal className="h-7 w-7 text-[#a855f7]" />
            <span>Review Log Archive</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Browse through your complete code auditing logs, explore score gauges, and inspect historical AI diffs.
          </p>
        </div>
        
        {isSupabaseConnected && currentUser && currentUser.id !== 'local_user' && (
          <button
            onClick={() => fetchReviewsFromSupabase()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0b0b0e] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Logs</span>
          </button>
        )}
      </div>

      {/* Control Filter Toolbar */}
      <div id="history-controls-panel" className="bg-[#0b0b0e] p-5 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Text Search Box */}
          <div className="relative md:col-span-3">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(10); // reset page view of search
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#050507] text-white text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#a855f7] focus:border-[#a855f7] placeholder:text-slate-600 transition-all font-mono"
            />
          </div>

          {/* Sort & Date Controls & Export */}
          <div className="md:col-span-9 flex flex-wrap gap-2 justify-end">
            <div className="flex gap-2 mr-4">
              <button onClick={() => exportToJson(filteredReviews, 'history')} className="text-[10px] font-bold text-slate-400 hover:text-white transition">JSON</button>
              <button onClick={() => exportToMarkdown(filteredReviews, 'history')} className="text-[10px] font-bold text-slate-400 hover:text-white transition">MD</button>
              <button onClick={() => exportToPdf(filteredReviews, 'history')} className="text-[10px] font-bold text-slate-400 hover:text-white transition">PDF</button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#050507] text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none"
            >
              {['Date: Newest', 'Date: Oldest', 'Score: High', 'Score: Low'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="bg-[#050507] text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none"
            >
              {['All', 'Last 7 Days', 'Last 30 Days'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
            {/* Score Filters */}
            <div className="flex bg-[#050507] p-1 rounded-xl border border-slate-850">
              {[
                { id: 'All', label: 'All' },
                { id: 'poor', label: 'Poor' },
                { id: 'average', label: 'Avg' },
                { id: 'good', label: 'Good' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setScoreFilter(opt.id);
                    setVisibleCount(10);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer select-none
                    ${scoreFilter === opt.id 
                      ? 'bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/25 shadow-sm' 
                      : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Language Quick Tabs selection row */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-900 pt-3.5">
          <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">
            Sub-Languages:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {uniqueLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguageFilter(lang);
                  setVisibleCount(10);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer select-none border
                  ${languageFilter === lang 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' 
                    : 'bg-[#050507] border-slate-850 text-slate-400 hover:text-white hover:border-slate-700'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Reviews Cards Listing */}
      {loading ? (
        <div className="bg-[#0b0b0e] py-16 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border border-slate-850">
          <div className="w-10 h-10 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-mono tracking-wider uppercase">Fetching historical sync artifacts...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        
        /* 5. Custom Empty State Illustration & Clean styling */
        <div className="bg-[#0b0b0e] py-16 px-6 text-center rounded-3xl border border-slate-850 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="bg-[#050507] p-5 rounded-full text-slate-600 border border-slate-800 shadow-inner flex items-center justify-center animate-bounce duration-1000">
            <FolderOpen className="h-10 w-10 text-[#a855f7]/60" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-base tracking-tight">No historical records found</h4>
            <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
              We couldn't check inside any matching audit files. Submit code for reviews first or adjust your filtering ranges to generate index logs.
            </p>
          </div>
        </div>

      ) : (
        
        /* List render with load more paginate limits */
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedReviews.map((r) => {
              // Score color tag configs
              const score = r.overall_score || 0;
              const ratingConfig = 
                score >= 75 
                  ? { text: 'text-emerald-400', bg: 'bg-emerald-900/10', border: 'border-emerald-500/10' } 
                  : score >= 50 
                  ? { text: 'text-amber-400', bg: 'bg-amber-950/10', border: 'border-amber-500/10' } 
                  : { text: 'text-rose-400', bg: 'bg-rose-950/10', border: 'border-rose-500/10' };

              return (
                <div 
                  id={`review-card-${r.id}`}
                  key={r.id}
                  className="bg-[#0b0b0e] p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    
                    {/* Header Row: Lang Badge, Date, Delete button */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider bg-slate-900 border border-slate-800 rounded-lg text-indigo-400">
                          {r.language}
                        </span>
                        <span className="text-[10px] font-medium text-slate-550 flex items-center gap-1 font-sans">
                          <Clock className="h-3 w-3" />
                          {formatDate(r.created_at)}
                        </span>
                      </div>

                      {/* Deletes safety trigger block */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === r.id ? (
                          <div className="flex items-center gap-1 bg-[#1c080e] px-2 py-0.5 rounded-lg border border-rose-900/40">
                            <span className="text-[9px] uppercase font-bold text-rose-400 font-mono leading-none mr-1">Purge log?</span>
                            <button 
                              onClick={() => handleDelete(r.id)}
                              className="text-[9px] font-black uppercase text-white bg-rose-600 hover:bg-rose-500 rounded px-2 py-0.5 transition cursor-pointer select-none"
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[9px] font-black uppercase text-slate-400 hover:text-white rounded px-1.5 py-0.5 transition cursor-pointer select-none"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(r.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-450 rounded-lg transition-all border border-transparent hover:border-rose-950 cursor-pointer"
                            title="Delete historic log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary snippet title */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-mono text-slate-500 tracking-wider uppercase font-extrabold">Executive Summary</h4>
                      <p className="text-sm text-slate-300 font-sans font-medium line-clamp-2 leading-relaxed">
                        "{r.feedback?.summary || r.summary || 'Summary placeholder'}"
                      </p>
                    </div>

                  </div>

                  {/* Rating score display & VIEW button */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">Score Output:</span>
                      <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-black tracking-tight font-mono ${ratingConfig.text} ${ratingConfig.bg} ${ratingConfig.border}`}>
                        {r.overall_score || 0}%
                      </span>
                    </div>

                    <button
                      id={`view-detail-btn-${r.id}`}
                      onClick={() => handleViewReview(r)}
                      className="px-4 py-1.5 bg-[#a855f7]/10 hover:bg-[#a855f7] border border-[#a855f7]/20 hover:border-transparent text-[#c084fc] hover:text-white text-xs font-extrabold uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md select-none"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Pagination Load More Button */}
          {hasMore && (
            <div id="pagination-load-more" className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-[#0b0b0e] hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-[#a855f7] hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer select-none"
              >
                Load More Logs ({filteredReviews.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {!hasMore && filteredReviews.length > 10 && (
            <div className="text-center text-[10px] font-mono text-slate-650 pt-4 uppercase tracking-widest leading-none">
              — End of evaluation archive log lines —
            </div>
          )}

        </div>
      )}

      {/* 4. Elegant Interactive MODAL Overlay showing full review results */}
      {activeReview && (
        <div 
          id="detailed-review-overlay-modal" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => handleCloseReview()}
        >
          <div 
            className="bg-[#0b0b0e] border border-slate-800/80 rounded-3xl w-full max-w-5xl max-h-[88vh] overflow-y-auto outline-none shadow-2xl relative scrollbar-thin flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCloseReview();
            }}
            tabIndex={0}
          >
            {/* Sticky Header inside modal */}
            <div className="sticky top-0 bg-[#0b0b0e]/95 backdrop-blur-md px-6 py-4 border-b border-slate-850 flex items-center justify-between z-30">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-xs font-bold uppercase font-mono tracking-wider bg-slate-950 border border-slate-850 rounded-xl text-indigo-400">
                  {activeReview.language}
                </span>
                <span className="text-[10px] font-medium text-slate-500 font-sans uppercase tracking-widest">
                  Evaluation Checkpoint details
                </span>
              </div>
              
              <button 
                onClick={() => handleCloseReview()}
                className="p-1.5 bg-[#050507] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-lg transition cursor-pointer"
                title="Dismiss overlay"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body Scroll container */}
            <div className="p-6 md:p-8 space-y-6 flex-1">
              <div className="mb-4 bg-slate-950 ring-1 ring-slate-850 p-4 rounded-xl flex items-center gap-3">
                <Clock className="h-4 w-4 text-[#a855f7]" />
                <span className="text-xs text-slate-400 font-sans font-bold uppercase">
                  Created snapshot timestamp:
                </span>
                <span className="text-xs font-mono text-[#c084fc] font-black">
                  {formatDate(activeReview.created_at)}
                </span>
              </div>

              {/* Render polished Recharts Radial Gauge scoreboard and side-by-side Diffs */}
              <ReviewResult 
                review={activeReview} 
                originalCodeSnippet={activeReview.code_snippet} 
                language={activeReview.language} 
              />
            </div>

            {/* Modal sticky Footer */}
            <div className="sticky bottom-0 bg-[#0b0b0e]/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-850 flex justify-end z-30">
              <button
                onClick={() => handleCloseReview()}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer select-none"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
