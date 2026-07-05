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
  Download
} from 'lucide-react';
import { exportToJson, exportToMarkdown, exportToPdf } from '@/lib/export';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { DiffEditor } from '@monaco-editor/react';

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

export default function ReviewResult({ review, originalCodeSnippet, language }: ReviewResultProps) {
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);

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

  // Support recharts requirements
  const chartData = [
    {
      name: 'Overall',
      value: overallScore,
      fill: overallConfig.fill,
    }
  ];

  // Backwards compatibility normalizers for fresh API results, local fallbacks, or saved logs
  const issuesList: Issue[] = [];
  if (review.issues && Array.isArray(review.issues)) {
    issuesList.push(...review.issues);
  } else if ((review as any).feedback?.key_issues && Array.isArray((review as any).feedback.key_issues)) {
    ((review as any).feedback.key_issues as string[]).forEach((issueStr) => {
      const regex = /^\[(.*?)\s*-\s*(.*?)\]\s*Line\s*(\d+):\s*(.*)$/i;
      const match = issueStr.match(regex);
      if (match) {
        issuesList.push({
          type: match[1],
          severity: (match[2].toLowerCase() as any) || 'medium',
          line: Number(match[3]),
          description: match[4]
        });
      } else {
        issuesList.push({
          type: 'Static Finding',
          severity: 'medium',
          line: 1,
          description: issueStr
        });
      }
    });
  }

  const suggestionsList: Suggestion[] = [];
  if (review.suggestions && Array.isArray(review.suggestions)) {
    suggestionsList.push(...review.suggestions);
  } else if ((review as any).feedback?.suggestions && Array.isArray((review as any).feedback.suggestions)) {
    ((review as any).feedback.suggestions as any[]).forEach((s) => {
      const parts = (s.issue || '').split(': ');
      const title = parts[0] || 'Refactoring Action';
      const explanation = parts.slice(1).join(': ') || s.issue || '';
      suggestionsList.push({
        title,
        explanation,
        improved_code: s.fix || ''
      });
    });
  }

  const executiveSummary = review.summary || (review as any).feedback?.summary || "No executive summary available.";

  return (
    <div id="review-result-container" className="space-y-8 animate-fade-in">
      <div className="flex justify-end gap-2">
        <button onClick={() => exportToJson(review, 'review')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><Download className="h-3 w-3"/> JSON</button>
        <button onClick={() => exportToMarkdown(review, 'review')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><Download className="h-3 w-3"/> MD</button>
        <button onClick={() => exportToPdf(review, 'review')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><Download className="h-3 w-3"/> PDF</button>
      </div>
      
      {/* 1. Scoreboards & Executive Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Side: Circular radial score gauge */}
        <div className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
          <span className="text-[10px] tracking-widest font-black uppercase text-slate-500 font-sans">
            Overall Security / Code Rating
          </span>
          <div className="relative flex items-center justify-center h-44 w-44">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span id="radial-score-value" className={`text-4xl font-extrabold ${overallConfig.text} leading-none font-sans`}>
                {overallScore}
              </span>
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                pts / 100
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="80%"
                outerRadius="100%"
                barSize={12}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: '#1e293b' }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${overallConfig.bg} ${overallConfig.text} border ${overallConfig.border}`}>
            {overallScore >= 75 ? 'Optimal Standards' : overallScore >= 50 ? 'Medium Compliance' : 'Severe Risk Alerts'}
          </span>
        </div>

        {/* Middle Segment: Executive Summary Box */}
        <div className="md:col-span-2 bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span className="text-[10px] tracking-widest font-black uppercase text-slate-400 font-sans">
                AI Executive Summary
              </span>
            </div>
            <p id="review-summary-paragraph" className="text-sm text-slate-300 font-sans leading-relaxed">
              {executiveSummary}
            </p>
          </div>

          {/* 2. Four Smaller Dim Score Badges */}
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

      {/* 3. Detailed Issues List with Severity Badges */}
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

      {/* 4. Suggestions Comparison Layout Segment */}
      <div id="review-suggestions-section" className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-6">
        
        <div className="border-b border-slate-850 pb-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-450" />
            <h3 className="text-base font-black text-white tracking-tight">Refactoring Suggestions & Code Diffs</h3>
          </div>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Choose a refactoring card below to expand the side-by-side interactive code diff showing the original snippet compared with the AI-optimized solution.
          </p>
        </div>

        {suggestionsList.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-indigo-400/80 animate-pulse" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">No refactoring recommendations required</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
              The analyzed file executes perfectly standard patterns out of the box. No major refactoring needed.
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
                  </button>
                );
              })}
            </div>

            {/* Active Refactor Diff Display */}
            <div className="lg:col-span-4 bg-[#050507] p-5 rounded-2xl border border-slate-850 flex flex-col gap-4">
              
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

              {/* Side-by-Side Monaco Diff Editor Container */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#09090c] rounded-t-xl border-t border-x border-slate-850">
                  <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-slate-500" />
                    <span>Original Snip</span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-650" />
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Refactored Output</span>
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

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
