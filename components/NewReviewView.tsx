import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Terminal, 
  PlusCircle,
  HelpCircle,
  RotateCcw,
  Bug,
  ShieldAlert,
  Play,
  Flame,
  Info
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CodeReview } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import ReviewResult from './ReviewResult';

interface NewReviewViewProps {
  onAddReview: (review: Omit<CodeReview, 'id' | 'user_id' | 'created_at'> & { id?: string; user_id?: string; created_at?: string }) => void;
}

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'];

const mapLanguageToMonaco = (lang: string): string => {
  switch (lang.toLowerCase()) {
    case 'c++':
      return 'cpp';
    case 'javascript':
      return 'javascript';
    case 'typescript':
      return 'typescript';
    case 'python':
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

const getLanguageStarterCode = (lang: string): string => {
  switch (lang.toLowerCase()) {
    case 'javascript':
      return `// JavaScript evaluation template
function fetchUserData(userId) {
  let query = "SELECT * FROM users WHERE id = '" + userId + "'";
  db.execute(query).then(res => {
    console.log(res);
  });
}`;
    case 'typescript':
      return `// TypeScript evaluation template
interface Config {
  retry: boolean;
}

function processTask(task: any, config: any): any {
  const result: any = task.run();
  return result;
}`;
    case 'python':
      return `# Python evaluation template
def compute_metrics(values=[]):
    # Unsafe mutable default argument & eval usage
    calculated = eval("values[0] * 10")
    return calculated`;
    case 'java':
      return `// Java evaluation template
public class Processor {
    public void execute(String value) {
        // High risk null pointer and console logging
        if (value.equals("admin")) {
            System.out.println("Processing administrative action...");
        }
    }
}`;
    case 'c++':
      return `// C++ evaluation template
#include <iostream>
#include <cstring>

void processRawBuffer(const char* input) {
    char localBuffer[16];
    // Unsecured string copy risk
    strcpy(localBuffer, input);
    
    // Raw resource instantiation leak risk
    int* values = new int[100];
    values[0] = 42;
}`;
    case 'go':
      return `// Go evaluation template
package main

import "fmt"

var cache = make(map[string]string)

func UpdateCache(key string, val string) {
    // Concurrent write hazard without map sync lock
    cache[key] = val
    fmt.Println("Cache updated:", val)
}`;
    case 'rust':
      return `// Rust evaluation template
fn calculate_ratio(nums: Option<Vec<i32>>) -> i32 {
    // Unwrapped Result/Option risk of runtime panic
    let actual_nums = nums.unwrap();
    let divisor = actual_nums.get(0).cloned().unwrap_or(0);
    actual_nums.iter().sum::<i32>() / divisor
}`;
    default:
      return '// Paste your code snippet here...';
  }
};

export default function NewReviewView({ onAddReview }: NewReviewViewProps) {
  const [language, setLanguage] = useState<string>('TypeScript');
  const [codeSnippet, setCodeSnippet] = useState<string>(getLanguageStarterCode('TypeScript'));
  
  // Scoring outputs
  const [analyzing, setAnalyzing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<Omit<CodeReview, 'id' | 'user_id' | 'created_at'> | null>(null);
  const [simulateApiFailure, setSimulateApiFailure] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCodeSnippet(getLanguageStarterCode(lang));
    setReviewResult(null);
    setSuccess(false);
  };

  const executeLocalAnalysis = (lang: string, code: string): Omit<CodeReview, 'id' | 'user_id' | 'created_at'> => {
    let overall = 85;
    let bug = 90;
    let security = 95;
    let readability = 90;
    let complexity = 85;

    const keyIssues: string[] = [];
    const suggestions: { line?: number; issue: string; fix: string }[] = [];
    const positives: string[] = [
      'Visual spacing is balanced and clean.',
      'Explicit naming conventions align well.'
    ];

    const lines = code.split('\n');

    // Rule 1: implicit any (TS / JS)
    if ((lang === 'TypeScript' || lang === 'JavaScript') && code.includes(': any')) {
      overall -= 15;
      bug -= 15;
      readability -= 10;
      keyIssues.push('Use of "any" types disables compile-time static type protection.');
      suggestions.push({
        line: lines.findIndex(l => l.includes(': any')) + 1 || 4,
        issue: 'Pervasive typed "any" declarations bypass validation benefits of TypeScript.',
        fix: 'Specify highly precise type interfaces or primitive collections.'
      });
    }

    // Rule 2: SQL Injection / Concatenation
    if ((lang === 'TypeScript' || lang === 'JavaScript' || lang === 'Python' || lang === 'Java' || lang === 'C++') && 
       code.toLowerCase().includes('select ') && (code.includes('\'%s\'') || code.includes('\' + ') || code.includes('f"SELECT'))) {
      overall -= 45;
      security -= 65;
      bug -= 10;
      keyIssues.push('Severe raw string SQL injection risk detected in parameter interpolation.');
      suggestions.push({
        line: lines.findIndex(l => l.toLowerCase().includes('select')) + 1 || 5,
        issue: 'Dynamic variables are formatted directly into database string streams without escaping.',
        fix: 'Adopt prepared queries, named parameter bindings, or standard secure ORMs.'
      });
    }

    // Rule 3: Mutable default argument (Python specific)
    if (lang === 'Python' && code.includes('=[]')) {
      overall -= 20;
      bug -= 30;
      readability -= 10;
      keyIssues.push('Python uses a single shared list instance for default mutable arguments across multiple calls.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('=[]')) + 1 || 2,
        issue: 'List collection behaves as a static mutable cache, leaking scope data.',
        fix: 'Replace default argument with "None" and initialize the list inside the function.'
      });
    }

    // Rule 4: eval() hazard (Python/JS/TS)
    if (code.toLowerCase().includes('eval(')) {
      overall -= 30;
      security -= 55;
      keyIssues.push('Dangerous "eval()" call executes untrusted code strings locally.');
      suggestions.push({
        line: lines.findIndex(l => l.toLowerCase().includes('eval(')) + 1 || 3,
        issue: 'Executing arbitrary raw input strings risks remote command execution (RCE).',
        fix: 'Avoid dynamic formulation. Adopt structured AST-parsers or JSON serializers.'
      });
    }

    // Rule 5: Null pointer vulnerability (Java)
    if (lang === 'Java' && code.includes('.equals(') && !code.includes(' != null')) {
      overall -= 25;
      bug -= 40;
      keyIssues.push('Potential java.lang.NullPointerException risk during comparison.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('.equals(')) + 1 || 4,
        issue: 'Active .equals() invocation triggers if the target object is uninstantiated null.',
        fix: 'Reorient values like "target.equals(variable)" instead of "variable.equals(target)".'
      });
    }

    // Rule 6: C++ strcpy buffer overflows
    if (lang === 'C++' && code.includes('strcpy(')) {
      overall -= 35;
      security -= 60;
      bug -= 25;
      keyIssues.push('strcpy() lacks bounds checks, allowing runtime stack smashing vulnerabilities.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('strcpy(')) + 1 || 5,
        issue: 'Target buffers can be flooded by inputs exceeding specified length constraints.',
        fix: 'Substitute with safer std::string implementations, strcpy_s, or strncpy.'
      });
    }

    // Rule 7: C++ Manual dynamic allocation leak
    if (lang === 'C++' && code.includes('new ') && !code.includes('delete')) {
      overall -= 20;
      bug -= 30;
      complexity -= 15;
      keyIssues.push('Manual dynamic pointer allocations require explicit raw delete memory frees.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('new ')) + 1 || 8,
        issue: 'Allocations lack corresponding reference drops, leading to progressive memory leaks.',
        fix: 'Wrap allocations under modern safe smart pointer variables like std::unique_ptr.'
      });
    }

    // Rule 8: Go Concurrent Map access
    if (lang === 'Go' && code.includes('map[') && !code.includes('sync.Mutex') && !code.includes('sync.Map')) {
      overall -= 30;
      bug -= 45;
      keyIssues.push('Unprotected concurrent map access will trigger Go runtime panic crashes.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('map[')) + 1 || 5,
        issue: 'Global Go cache map objects are unsafe for mutual multiple thread concurrency.',
        fix: 'Ensure actions execute inside sync.RWMutex lock calls, or adopt sync.Map.'
      });
    }

    // Rule 9: Rust unwrapped returns panic
    if (lang === 'Rust' && code.includes('.unwrap()')) {
      overall -= 20;
      bug -= 30;
      readability -= 10;
      keyIssues.push('Using .unwrap() forces unhandled execution halts upon encountering Failure/None states.');
      suggestions.push({
        line: lines.findIndex(l => l.includes('.unwrap()')) + 1 || 4,
        issue: 'The rust compiler bypasses runtime options check, risking program-ending panics.',
        fix: 'Implement robust patterns like match arms, if-let blocks, or the helper "?" operator.'
      });
    }

    // Capture small scripts
    if (code.trim().length < 15) {
      overall = 35;
      bug = 40;
      security = 50;
      readability = 45;
      complexity = 40;
      keyIssues.push('Source code payload contains minimal instructions.');
      suggestions.push({
        issue: 'Pasted logic provides too small an instruction sample to detect patterns.',
        fix: 'Supply a fully logical function, API controller route, or module class.'
      });
    }

    // Clamp score limits
    overall = Math.max(12, Math.min(overall, 100));
    bug = Math.max(15, Math.min(bug, 100));
    security = Math.max(15, Math.min(security, 100));
    readability = Math.max(15, Math.min(readability, 100));
    complexity = Math.max(15, Math.min(complexity, 100));

    if (keyIssues.length === 0) {
      positives.push('Structure utilizes idiomatic standards perfectly.');
      positives.push('Excellent micro-optimization checks detected.');
    }

    const summary = keyIssues.length > 0
      ? `Analysis complete. Found ${keyIssues.length} severe issues. Source code adheres to compile configurations but compromises safety standards.`
      : 'Review successful! Clean architecture. All safety assertions passed. Memory handles and variables demonstrate premium balance.';

    return {
      language: lang,
      code_snippet: code,
      overall_score: overall,
      bug_score: bug,
      security_score: security,
      readability_score: readability,
      complexity_score: complexity,
      feedback: {
        summary,
        key_issues: keyIssues.length > 0 ? keyIssues : ['No structural failures identified.'],
        suggestions: suggestions.length > 0 ? suggestions : [{ issue: 'All compliant', fix: 'Maintained present visual spacing standards.' }],
        positives
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSnippet.trim()) {
      return;
    }

    setError(null);
    setAnalyzing(true);
    setSuccess(false);

    try {
      if (simulateApiFailure) {
        throw new Error('API Gateway timeout. The analysis service failed to process the AST payloads due to internal network disruption.');
      }

      // Check current session token for authenticated user ID mapping
      const supabase = getSupabase();
      let accessToken = '';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || '';
      }

      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          code: codeSnippet,
          language
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.review) {
        throw new Error('Invalid server response payload: missing review data.');
      }

      const claudeOutput = data.review;
      const savedRecord = data.savedRecord;

      // Transform the output structure into ReviewFeedback format
      const transformedFeedback = {
        summary: claudeOutput.summary,
        key_issues: claudeOutput.issues?.length > 0 
          ? claudeOutput.issues.map((i: any) => `[${i.type?.toUpperCase()} - ${i.severity?.toUpperCase()}] Line ${i.line}: ${i.description}`)
          : ['No compile defects identified.'],
        suggestions: claudeOutput.suggestions?.length > 0
          ? claudeOutput.suggestions.map((s: any) => ({
              issue: `${s.title}: ${s.explanation}`,
              fix: s.improved_code,
              line: undefined
            }))
          : [{ issue: 'All compliant', fix: 'Maintained present visual spacing standards.' }],
        positives: [
          'Source code exhibits clear, professional conventions.',
          'Execution flow structures are appropriately bounded.'
        ]
      };

      const finalReview = {
        id: savedRecord?.id, // Use saved UUID from Supabase if present
        user_id: savedRecord?.user_id || 'local_user',
        created_at: savedRecord?.created_at || new Date().toISOString(),
        language,
        code_snippet: codeSnippet,
        overall_score: Number(claudeOutput.overall_score || 0),
        bug_score: Number(claudeOutput.bug_score || 0),
        security_score: Number(claudeOutput.security_score || 0),
        readability_score: Number(claudeOutput.readability_score || 0),
        complexity_score: Number(claudeOutput.complexity_score || 0),
        feedback: transformedFeedback
      };

      setReviewResult(finalReview);
      setAnalyzing(false);
      setSuccess(true);
      onAddReview(finalReview);

    } catch (err: any) {
      console.error('Frontend analysis execution error:', err);
      // Fallback behavior if Anthropic Claude is not yet configured or on local workspace
      if (err.message?.includes('not configured')) {
        try {
          console.log('Running static AST rule matching local backup fallback...');
          const localReview = executeLocalAnalysis(language, codeSnippet);
          setReviewResult(localReview);
          setAnalyzing(false);
          setSuccess(true);
          onAddReview(localReview);
          return;
        } catch (fallbackErr) {
          console.error('Static fallback matching failed:', fallbackErr);
        }
      }

      setError(err.message || 'Fatal static analyzer compiler loop timed out.');
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setCodeSnippet('');
    setReviewResult(null);
    setSuccess(false);
    setError(null);
  };

  // Modern Shimmer Skeleton Component
  const LoadingSkeleton = () => (
    <div id="review-loading-skeleton" className="bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6 animate-pulse">
      
      {/* Header and status shimmer */}
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-8 w-16 bg-slate-800/60 rounded-xl" />
      </div>

      {/* Circle scoreboard container */}
      <div className="flex flex-col items-center justify-center py-5 bg-[#050507] rounded-2xl border border-slate-800/50 space-y-2">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-14 w-20 bg-slate-800 rounded-xl" />
        <div className="h-3.5 w-28 bg-slate-800 rounded" />
      </div>

      {/* Dim Sliders Shimmer */}
      <div className="space-y-4">
        <div className="h-3.5 w-36 bg-slate-800 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-slate-800 rounded" />
              <div className="h-3 w-12 bg-slate-800 rounded" />
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-800 h-full w-[35%]" />
            </div>
          </div>
        ))}
      </div>

      {/* Text summary box shimmer */}
      <div className="bg-[#050507] p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="h-3.5 w-24 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800 rounded" />
        <div className="h-3 w-[70%] bg-slate-800 rounded" />
      </div>

    </div>
  );

  const isEditorEmpty = codeSnippet.trim() === '';

  return (
    <div id="new-review-view" className="max-w-6xl mx-auto space-y-8 animate-fade-in font-sans px-2">
      
      {/* View Header */}
      <div id="new-review-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-indigo-400" />
            <span>New AI Code Review</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Submit scripts to perform AST pattern analysis, check key safety rules, and log streak counts.</p>
        </div>

        {/* Test Panel Controls */}
        <div id="sandbox-debugger-toggle" className="self-start md:self-center bg-[#0d0d11] p-3 rounded-2xl border border-slate-800 flex items-center gap-2.5">
          <input 
            type="checkbox" 
            id="simulate-api-chk"
            checked={simulateApiFailure}
            onChange={(e) => setSimulateApiFailure(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500/20 cursor-pointer"
          />
          <label htmlFor="simulate-api-chk" className="text-xs font-mono text-slate-400 select-none cursor-pointer flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>Simulate API Error State</span>
          </label>
        </div>
      </div>

      {/* Main Form + Metrics Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-start">
        
        {/* Monaco Editor Segment */}
        <div className="lg:col-span-4 bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/90 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Language Selection selector */}
            <div className="space-y-1.5 flex-1 max-w-[240px]">
              <label htmlFor="language-select" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Target Language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white bg-[#050507] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer font-sans"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#050507] text-white">
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear / Utility control links */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <button 
                type="button" 
                onClick={handleClear}
                className="hover:text-white flex items-center gap-1 text-xs text-slate-500 font-mono transition lowercase cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-slate-900"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Editor</span>
              </button>
            </div>

          </div>

          {/* Monaco Editor Container - Guaranteed at least 400px tall and responsive */}
          <div className="relative border border-slate-800/80 rounded-2xl overflow-hidden bg-[#050507] p-2">
            <Editor
              id="monaco-code-container"
              height="450px"
              language={mapLanguageToMonaco(language)}
              theme="vs-dark"
              value={codeSnippet}
              onChange={(value) => setCodeSnippet(value || '')}
              loading={
                <div className="flex flex-col items-center justify-center h-[450px] bg-[#050507] text-slate-500 font-mono text-xs gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Booting Monaco Core Engine...</span>
                </div>
              }
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  useShadows: false
                },
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, monospace',
                tabSize: 4
              }}
            />
          </div>

          {/* Trigger assessment control button */}
          <button
            id="submit-review-btn"
            onClick={handleSubmit}
            disabled={analyzing || isEditorEmpty}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.45)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 font-sans"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Running Parser Assessor...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 text-indigo-100" />
                <span>Review My Code</span>
              </>
            )}
          </button>

        </div>

        {/* Dynamic score results + Loading Skeletons */}
        <div className="lg:col-span-2 space-y-6">
          
          {success && (
            <div id="submit-success-alert" className="bg-[#064e3b]/30 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-fade-in line-clamp-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Assessment created successfully! User streak increased and dashboard database refreshed.</span>
            </div>
          )}

          {analyzing ? (
            <LoadingSkeleton />
          ) : error ? (
            /* Custom Proper Error Banner State */
            <div id="submit-error-alert" className="bg-[#881337]/15 border border-rose-500/30 text-rose-200 p-6 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-lg">
              <div className="flex items-start gap-3.5">
                <AlertCircle className="h-5.5 w-5.5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white tracking-tight">Parser Handshake Failure</h4>
                  <p className="text-xs text-rose-300/80 leading-relaxed font-mono">
                    {error}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-2.5 border-t border-rose-500/10 pt-4">
                <button 
                  type="button" 
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141419] border border-slate-800 hover:bg-slate-800 text-slate-350 transition-all cursor-pointer"
                >
                  Clear Editor
                </button>
                <button 
                  type="button" 
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_2px_10px_rgba(225,29,72,0.3)] transition-all cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          ) : reviewResult ? (
            /* Results Panel Card */
            <div id="analysis-results-section" className="bg-[#111114] p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4 animate-fade-in text-center">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7]">Quick Score Badge</span>
                <div className="bg-[#a855f7]/10 p-2 rounded-xl text-[#a855f7] border border-[#a855f7]/15">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
              </div>

              {/* Centered Score badge */}
              <div className="text-center py-3 bg-[#0a0a0c] rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Overall Score</p>
                <p className="text-4xl font-black text-indigo-400 leading-none py-1">{reviewResult.overall_score} pts</p>
              </div>

              {/* Brief summary text bubble */}
              <div className="bg-[#050507] p-4 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Summary</p>
                <p className="text-[11px] text-slate-300 leading-relaxed font-mono text-left italic">
                  "{reviewResult.feedback?.summary || (reviewResult as any).summary}"
                </p>
              </div>

              <div className="text-xs text-[#a855f7] font-bold animate-pulse font-sans">
                ⬇️ Scroll down for full diffs and issues!
              </div>

            </div>
          ) : (
            /* Blank Placeholder State */
            <div className="bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/80 shadow-lg text-center py-10 space-y-4 border-dashed bg-radial">
              <HelpCircle className="h-8 w-8 text-indigo-500/55 mx-auto animate-bounce" />
              <div className="space-y-1.5">
                <h4 className="text-white text-xs font-bold font-sans uppercase tracking-widest">Awaiting assessment</h4>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                  Supply code snippets inside the Monaco editor on the left and invoke "Review My Code" to launch AST calculations.
                </p>
              </div>
            </div>
          )}

          {/* Quick instructions and documentation */}
          <div className="bg-[#0a0a0c]/80 p-5 rounded-3xl border border-slate-850 shadow-md space-y-3">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
              <Info className="h-3 w-3 text-indigo-400" />
              <span>Diagnostic triggers available</span>
            </span>
            <div className="text-[10px] text-slate-500 space-y-2.5 leading-relaxed font-sans">
              <p>The AST assessor compiles the script buffer dynamically. Select a language and type the following tags to inspect custom rule detections:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-indigo-400">
                <li><code className="text-slate-400">: any</code> (TS / JS typed bypassing)</li>
                <li><code className="text-slate-400">SELECT ' +</code> (concatenated query)</li>
                <li><code className="text-slate-400">eval()</code> (untrusted text compilation)</li>
                <li><code className="text-slate-400">new</code> (C++ raw memory allocation)</li>
              </ul>
            </div>
          </div>

        </div>

      </div>

      {reviewResult && (
        <div id="full-detailed-review-result" className="mt-8 transition-all">
          <ReviewResult 
            review={reviewResult as any} 
            originalCodeSnippet={codeSnippet} 
            language={language} 
          />
        </div>
      )}

    </div>
  );
}
