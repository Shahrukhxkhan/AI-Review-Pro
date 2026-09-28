import React, { useState } from 'react';
import { 
  Bug, 
  ShieldAlert, 
  BookOpen, 
  Terminal, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  HelpCircle, 
  FileCode, 
  ArrowRight, 
  Download,
  Share2,
  MessageSquare,
  Send,
  Copy,
  Check,
  Bot,
  User,
  Zap,
  RotateCcw,
  GitPullRequest
} from 'lucide-react';
import { exportToJson, exportToMarkdown, exportToPdf } from '@/lib/export';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { DiffEditor } from '@monaco-editor/react';
import { ChatMessage } from '@/types';
import SandboxRunner from './SandboxRunner';
import CreatePrModal from './CreatePrModal';

interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  line: number;
  description: string;
}

interface Suggestion {
  title: string;
  explanation: string;
  improved_code: string;
}

interface ReviewResultProps {
  review: {
    overall_score: number;
    bug_score: number;
    security_score: number;
    readability_score: number;
    complexity_score: number;
    issues?: Issue[];
    suggestions?: Suggestion[];
    summary: string;
  };
  originalCodeSnippet: string;
  language: string;
  onApplySuggestion?: (improvedCode: string) => void;
}

const mapLanguageToMonaco = (lang: string): string => {
  switch (lang.toLowerCase()) {
    case 'c++':
    case 'cpp':
      return 'cpp';
    case 'javascript':
    case 'js':
      return 'javascript';
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'python':
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'rust':
      return 'rust';
    default:
      return 'typescript';
  }
};

export default function ReviewResult({ review, originalCodeSnippet, language, onApplySuggestion }: ReviewResultProps) {
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  // Interactive Follow-up Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I have audited your ${language} code. You can ask me follow-up questions, request alternative refactorings, or ask me to write automated unit tests for this code.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const overallScore = Number(review.overall_score || 0);
  const bugScore = Number(review.bug_score || 0);
  const securityScore = Number(review.security_score || 0);
  const readabilityScore = Number(review.readability_score || 0);
  const complexityScore = Number(review.complexity_score || 0);

  // Score color helper function
  const getScoreColor = (score: number) => {
    if (score < 50) return { text: 'text-rose-450', bg: 'bg-rose-500/10', border: 'border-rose-550/20', fill: '#ef4444' };
    if (score <= 75) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', fill: '#f59e0b' };
    return { text: 'text-emerald-450', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', fill: '#10b981' };
  };

  const overallConfig = getScoreColor(overallScore);
  const bugConfig = getScoreColor(bugScore);
  const securityConfig = getScoreColor(securityScore);
  const readabilityConfig = getScoreColor(readabilityScore);
  const complexityConfig = getScoreColor(complexityScore);

  const chartData = [
    {
      name: 'Overall',
      value: overallScore,
      fill: overallConfig.fill,
    }
  ];

  const issuesList: Issue[] = review.issues || [];
  const suggestionsList: Suggestion[] = review.suggestions || [];
  const executiveSummary = review.summary || 'Code evaluated. No major design vulnerabilities flagged.';

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (improvedCode: string, index: number) => {
    if (onApplySuggestion) {
      onApplySuggestion(improvedCode);
      setAppliedIndex(index);
      setTimeout(() => setAppliedIndex(null), 2500);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/review/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: originalCodeSnippet,
          language,
          reviewSummary: executiveSummary,
          messages: newHistory.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Failed to communicate with review assistant:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to generate response. Please verify GEMINI_API_KEY.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = [
    'Can you rewrite this using async/await?',
    'Write automated unit tests for this code',
    'How do I fix this without changing DB schema?',
    'Explain the Big-O time and memory complexity'
  ];

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* 1. Header Segment: Overall Score & Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Segment: Radial Score Gauge Card */}
        <div className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-slate-850 pb-2.5 mb-2">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 font-sans">
              Quality Index
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${overallConfig.bg} ${overallConfig.text} border ${overallConfig.border}`}>
              {overallScore >= 80 ? 'Grade A' : overallScore >= 60 ? 'Grade B' : 'Grade C'}
            </span>
          </div>

          <div className="relative w-44 h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="75%" 
                outerRadius="100%" 
                barSize={12} 
                data={chartData} 
                startAngle={90} 
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-4xl font-mono font-black ${overallConfig.text}`}>
                {overallScore}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">
                OUT OF 100
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-sans font-medium text-center mt-1">
            Overall Architecture Health
          </span>
        </div>

        {/* Middle Segment: Executive Summary Box */}
        <div className="md:col-span-2 bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-[10px] tracking-widest font-black uppercase text-slate-400 font-sans">
                  AI Executive Summary
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const reviewId = (review as any).id || 'sample';
                    const shareUrl = `${window.location.origin}/share/${reviewId}`;
                    navigator.clipboard.writeText(shareUrl);
                    setShareToast(true);
                    setTimeout(() => setShareToast(false), 2500);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#16161f] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-accent" />
                  <span>{shareToast ? 'Link Copied!' : 'Share'}</span>
                </button>

                <button
                  onClick={() => exportToPdf(review as any, `audit-${language}-${Date.now()}`)}
                  className="px-3 py-1 rounded-lg bg-[#16161f] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            <p id="review-summary-paragraph" className="text-sm text-slate-300 font-sans leading-relaxed">
              {executiveSummary}
            </p>
          </div>

          {/* Four Smaller Dim Score Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#050507] p-4 rounded-2xl border border-slate-800/60">
            {/* Bugs */}
            <div className="text-center space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Bugs</span>
              <div className="flex items-center justify-center gap-1.5">
                <Bug className={`h-3.5 w-3.5 ${bugConfig.text}`} />
                <span className={`font-mono text-sm font-black ${bugConfig.text}`}>{bugScore}%</span>
              </div>
            </div>

            {/* Security */}
            <div className="text-center space-y-1 border-l border-slate-800/80">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Security</span>
              <div className="flex items-center justify-center gap-1.5">
                <ShieldAlert className={`h-3.5 w-3.5 ${securityConfig.text}`} />
                <span className={`font-mono text-sm font-black ${securityConfig.text}`}>{securityScore}%</span>
              </div>
            </div>

            {/* Readability */}
            <div className="text-center space-y-1 border-l border-slate-800/80">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Readability</span>
              <div className="flex items-center justify-center gap-1.5">
                <BookOpen className={`h-3.5 w-3.5 ${readabilityConfig.text}`} />
                <span className={`font-mono text-sm font-black ${readabilityConfig.text}`}>{readabilityScore}%</span>
              </div>
            </div>

            {/* Complexity */}
            <div className="text-center space-y-1 border-l border-slate-800/80">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Complexity</span>
              <div className="flex items-center justify-center gap-1.5">
                <Terminal className={`h-3.5 w-3.5 ${complexityConfig.text}`} />
                <span className={`font-mono text-sm font-black ${complexityConfig.text}`}>{complexityScore}%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 2. Detailed Issues List with Severity Badges */}
      <div id="review-issues-section" className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-450" />
            <h3 className="text-base font-black text-white tracking-tight">Identified Code Issues</h3>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">
            {issuesList.length} total defect{issuesList.length !== 1 ? 's' : ''} detected
          </span>
        </div>

        {issuesList.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-400/80" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Perfect Compliance</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
              Our expert LLM parser verified all AST configurations. No compiler defects or design warnings reported.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {issuesList.map((issue, index) => {
              const severityStyles = 
                issue.severity === 'high' 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : issue.severity === 'medium'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

              return (
                <div 
                  key={index} 
                  className="bg-[#050507] p-4 rounded-xl border border-slate-800/60 flex items-start justify-between gap-4 transition hover:border-slate-800"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${severityStyles}`}>
                        {issue.severity}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-900/10 px-2 py-0.5 rounded border border-indigo-500/10">
                        Line {issue.line}
                      </span>
                      <span className="text-[10px] font-sans text-slate-500 uppercase font-black tracking-wider">
                        {issue.type || 'Rule Tag'}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans mt-1">
                      {issue.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Suggestions Comparison Layout Segment */}
      <div id="review-suggestions-section" className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-450" />
              <h3 className="text-base font-black text-white tracking-tight">Refactoring Suggestions & Code Diffs</h3>
            </div>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Compare AI-optimized solutions against the original snippet. Apply refactors directly back to the editor with 1 click.
            </p>
          </div>

          {onApplySuggestion && suggestionsList.length > 0 && (
            <button
              onClick={() => handleApply(suggestionsList[activeSuggestionIndex]?.improved_code || '', activeSuggestionIndex)}
              className="bg-accent text-bg px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-lg shadow-accent/15"
            >
              {appliedIndex === activeSuggestionIndex ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Applied to Editor!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Apply Refactor #{activeSuggestionIndex + 1}</span>
                </>
              )}
            </button>
          )}
        </div>

        {suggestionsList.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-indigo-400/80 animate-pulse" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">No refactoring recommendations required</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
              The analyzed file executes standard patterns cleanly. No major refactoring needed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-stretch">
            
            {/* List of Refactoring Cards */}
            <div className="lg:col-span-2 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {suggestionsList.map((suggestion, index) => {
                const isActive = activeSuggestionIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSuggestionIndex(index)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer select-none
                      ${isActive 
                        ? 'bg-indigo-600/10 border-indigo-550 shadow-md ring-1 ring-indigo-500/30' 
                        : 'bg-[#050507] border-slate-850 hover:bg-[#09090c] hover:border-slate-800'}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-400' : 'text-slate-550 font-mono'}`}>
                      Refactoring #{index + 1}
                    </span>
                    <h4 className="text-xs font-bold text-white tracking-tight line-clamp-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-normal">
                      {suggestion.explanation}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-850/60">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(suggestion.improved_code, index);
                        }}
                        className="text-[9px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIndex === index ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copiedIndex === index ? 'Copied' : 'Copy Fix'}
                      </span>
                      {onApplySuggestion && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(suggestion.improved_code, index);
                          }}
                          className="text-[9px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Apply
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Refactor Diff Display */}
            <div className="lg:col-span-4 bg-[#050507] p-5 rounded-2xl border border-slate-850 flex flex-col gap-4">
              
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#a855f7] block">
                    Active Comparison Explanation
                  </span>
                  <h4 className="text-sm font-extrabold text-white">
                    {suggestionsList[activeSuggestionIndex]?.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {suggestionsList[activeSuggestionIndex]?.explanation}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSandbox(!showSandbox)}
                    className="bg-[#121218] border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Terminal className="w-3 h-3 text-accent" />
                    {showSandbox ? 'Hide Test Runner' : 'Run Tests'}
                  </button>

                  <button
                    onClick={() => setIsPrModalOpen(true)}
                    className="bg-purple-600/15 border border-purple-500/30 text-purple-300 hover:bg-purple-600/25 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <GitPullRequest className="w-3 h-3 text-purple-400" />
                    Create PR
                  </button>

                  {onApplySuggestion && (
                    <button
                      onClick={() => handleApply(suggestionsList[activeSuggestionIndex]?.improved_code || '', activeSuggestionIndex)}
                      className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Apply Code
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Monaco Diff Editor Container */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#09090c] rounded-t-xl border-t border-x border-slate-850">
                  <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-slate-500" />
                    <span>Original Code</span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-650" />
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Refactored Solution</span>
                  </span>
                </div>
                
                <div className="border border-slate-850 rounded-b-xl overflow-hidden relative bg-[#050507] p-1">
                  <DiffEditor
                    height="280px"
                    language={mapLanguageToMonaco(language)}
                    theme="vs-dark"
                    original={originalCodeSnippet}
                    modified={suggestionsList[activeSuggestionIndex]?.improved_code || ''}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      renderSideBySide: true,
                      fontSize: 11,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto'
                      },
                      lineNumbers: 'on',
                      wordWrap: 'on'
                    }}
                    loading={
                      <div className="flex flex-col items-center justify-center h-[280px] bg-[#050507] text-slate-550 font-mono text-xs gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Rendering line comparison diffs...</span>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* In-Browser Sandboxed Runner Panel */}
              {showSandbox && (
                <div className="pt-2 animate-fade-in">
                  <SandboxRunner
                    code={suggestionsList[activeSuggestionIndex]?.improved_code || originalCodeSnippet}
                    language={language}
                    suggestionTitle={suggestionsList[activeSuggestionIndex]?.title}
                  />
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* 1-Click Pull Request Modal */}
      <CreatePrModal
        isOpen={isPrModalOpen}
        onClose={() => setIsPrModalOpen(false)}
        originalCode={originalCodeSnippet}
        improvedCode={suggestionsList[activeSuggestionIndex]?.improved_code || originalCodeSnippet}
        language={language}
        suggestionTitle={suggestionsList[activeSuggestionIndex]?.title || 'code refactoring'}
      />

      {/* 4. Interactive Follow-up Chat: "Ask AI About This Review" */}
      <div id="review-chat-section" className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-850 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Interactive Follow-up Assistant</h3>
              <p className="text-xs text-slate-500">Ask clarifying questions, request alternative patterns, or generate unit tests</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Gemini 2.5 Flash
          </span>
        </div>

        {/* Quick Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider shrink-0">Quick Ask:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              disabled={chatLoading}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-medium bg-[#050507] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin bg-[#050507] p-4 rounded-2xl border border-slate-800/80">
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 text-xs leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl space-y-1.5 ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-[#0f0f14] border border-slate-800 text-slate-300 rounded-tl-none font-sans'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[9px] opacity-60 font-mono">
                    <span>{isUser ? 'You' : 'AI Review Pro'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {msg.content}
                  </div>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {chatLoading && (
            <div className="flex gap-3 text-xs justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#0f0f14] border border-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-400 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Generating explanation...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            placeholder="Ask anything about this code review (e.g. 'Can you convert this to TypeScript interfaces?')..."
            className="flex-1 bg-[#050507] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-accent transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="bg-accent text-bg px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-accent/10"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}
