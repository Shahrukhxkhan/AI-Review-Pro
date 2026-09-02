import React, { useState, useEffect } from 'react';
import { CodeReview } from '@/types';
import ReviewResult from './ReviewResult';
import { loadFromLocal, SEED_REVIEWS } from '@/lib/utils';
import { 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  ArrowLeft, 
  AlertCircle, 
  ShieldCheck, 
  Calendar,
  ExternalLink,
  Code2
} from 'lucide-react';

interface ShareViewProps {
  reviewId: string | null;
  onNavigateToApp: () => void;
}

export default function ShareView({ reviewId, onNavigateToApp }: ShareViewProps) {
  const [review, setReview] = useState<CodeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!reviewId) {
      setError('No review ID specified in URL.');
      setLoading(false);
      return;
    }

    const fetchReview = async () => {
      setLoading(true);
      setError(null);

      // 1. Try server public endpoint
      try {
        const res = await fetch(`/api/public/review/${reviewId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.review) {
            setReview(data.review);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load review from remote database:', err);
      }

      // 2. Local storage fallback
      try {
        const localReviews = loadFromLocal<CodeReview[]>('gamified_code_reviews', SEED_REVIEWS);
        const match = localReviews.find(r => r.id === reviewId);
        if (match) {
          setReview(match);
          setLoading(false);
          return;
        }
        
        // If not matched, use first seed as preview if id is demo
        if (reviewId.startsWith('rev-') || reviewId.startsWith('sample')) {
          setReview(localReviews[0] || SEED_REVIEWS[0]);
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore
      }

      setError('The requested code audit report could not be found or has expired.');
      setLoading(false);
    };

    fetchReview();
  }, [reviewId]);

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] text-slate-200 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          Loading Public Audit Report...
        </p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] text-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-xs text-slate-400 max-w-md">{error}</p>
        <button
          onClick={onNavigateToApp}
          className="mt-4 bg-accent text-bg px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
        >
          Go to AI Review Pro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-slate-200 font-sans pb-16">
      
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800/80 bg-[#070709]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToApp}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-mono transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>App</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm text-accent uppercase tracking-wider">AI-Review Pro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Shared Report
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyShareLink}
              className="bg-[#16161f] hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-accent" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
            </button>

            <button
              onClick={onNavigateToApp}
              className="bg-accent text-bg px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <span>Launch Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Shared Content */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
        
        {/* Report Meta Card */}
        <div className="bg-[#0b0b0e] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
              <Code2 className="w-4 h-4 text-accent" />
              <span>Language: <strong className="text-white font-bold">{review.language}</strong></span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Code Quality & Security Audit
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Report ID: {review.id}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#050507] p-3 rounded-xl border border-slate-800/80">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">Verified Score</div>
              <div className="text-xl font-mono font-black text-accent">{review.overall_score} / 100</div>
            </div>
          </div>
        </div>

        {/* Full Review Result Component */}
        <ReviewResult 
          review={review as any} 
          originalCodeSnippet={review.code_snippet} 
          language={review.language} 
        />

        {/* Bottom CTA Banner */}
        <div className="bg-gradient-to-r from-[#0b0b0e] via-[#14141f] to-[#0b0b0e] border border-slate-800/80 rounded-2xl p-8 text-center space-y-3 shadow-2xl">
          <Sparkles className="w-8 h-8 text-accent mx-auto" />
          <h3 className="text-lg font-bold text-white">Perform AI Audits on Your Own Codebase</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Audit Pull Requests, detect OWASP vulnerabilities, maintain review streaks, and export PDF compliance reports with AI Review Pro.
          </p>
          <button
            onClick={onNavigateToApp}
            className="mt-2 bg-accent text-bg px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
          >
            Start Free Audit
          </button>
        </div>

      </main>

    </div>
  );
}
