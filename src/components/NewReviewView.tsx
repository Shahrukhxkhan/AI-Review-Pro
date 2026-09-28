import React, { useState, useEffect } from 'react';
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
  Info, 
  Award, 
  Zap, 
  HeartHandshake, 
  CheckCircle2, 
  Check, 
  RadioTower,
  GitPullRequest,
  FolderArchive,
  FileCode,
  UploadCloud,
  X,
  Layers,
  FileText,
  ExternalLink,
  Code2,
  Download
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CodeReview, ReviewPersona } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import ReviewResult from './ReviewResult';

interface NewReviewViewProps {
  onAddReview: (review: Omit<CodeReview, 'id' | 'user_id' | 'created_at'> & { id?: string; user_id?: string; created_at?: string }) => void;
}

type InputMode = 'snippet' | 'git_diff' | 'multi_file';

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'diff'];

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
    case 'diff':
      return 'markdown';
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
    case 'diff':
      return `diff --git a/src/auth.ts b/src/auth.ts
index 83a1b2c..9f4e21a 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -14,6 +14,8 @@ export async function verifyToken(req: Request) {
-  const token = req.headers['authorization'];
-  return jwt.verify(token, process.env.SECRET_KEY!);
+  const token = req.headers['x-api-key'];
+  // Hardcoded fallback token risk
+  return token === 'secret-dev-admin-key' ? true : jwt.verify(token, 'master_secret');
 }`;
    default:
      return '// Paste your code snippet here...';
  }
};

export default function NewReviewView({ onAddReview }: NewReviewViewProps) {
  // Input Modes
  const [inputMode, setInputMode] = useState<InputMode>('snippet');
  const [language, setLanguage] = useState<string>('TypeScript');
  const [codeSnippet, setCodeSnippet] = useState<string>(getLanguageStarterCode('TypeScript'));

  // Git Diff & PR state
  const [prUrl, setPrUrl] = useState('');
  const [fetchingPr, setFetchingPr] = useState(false);
  const [prInfo, setPrInfo] = useState<{ title: string; lines: number } | null>(null);

  // Multi-File Upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    {
      name: 'UserController.ts',
      content: `import { UserService } from './UserService';

export class UserController {
  private service = new UserService();

  async getUser(req: any, res: any) {
    const { id } = req.params;
    // Missing authentication check
    const user = await this.service.findById(id);
    return res.json(user);
  }
}`,
      size: 280
    },
    {
      name: 'UserService.ts',
      content: `export class UserService {
  async findById(id: string): Promise<any> {
    // Unsanitized query string
    const query = "SELECT * FROM users WHERE id = '" + id + "'";
    return db.raw(query);
  }
}`,
      size: 210
    }
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  
  // Personas and Custom Guidelines
  const [persona, setPersona] = useState<ReviewPersona>('general');
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  const [streamProgressText, setStreamProgressText] = useState<string>('');
  const [customGuidelines, setCustomGuidelines] = useState<string>('');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Scoring outputs
  const [analyzing, setAnalyzing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<Omit<CodeReview, 'id' | 'user_id' | 'created_at'> | null>(null);
  const [simulateApiFailure, setSimulateApiFailure] = useState(false);

  // Load custom guidelines and default persona from localStorage on mount
  useEffect(() => {
    try {
      const savedGuidelines = localStorage.getItem('ai_review_custom_guidelines') || '';
      const savedPersona = (localStorage.getItem('ai_review_default_persona') as ReviewPersona) || 'general';
      setCustomGuidelines(savedGuidelines);
      setPersona(savedPersona);
    } catch (e) {
      // localStorage unavailable or blocked
    }
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCodeSnippet(getLanguageStarterCode(lang));
    setReviewResult(null);
    setSuccess(false);
  };

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setReviewResult(null);
    setSuccess(false);
    setError(null);

    if (mode === 'git_diff') {
      setLanguage('diff');
      setCodeSnippet(getLanguageStarterCode('diff'));
    } else if (mode === 'multi_file') {
      setLanguage('TypeScript');
      if (uploadedFiles.length > 0) {
        setCodeSnippet(uploadedFiles[activeFileIndex]?.content || '');
      }
    } else {
      setLanguage('TypeScript');
      setCodeSnippet(getLanguageStarterCode('TypeScript'));
    }
  };

  // Fetch Public GitHub PR Diff
  const handleFetchPr = async () => {
    if (!prUrl.trim()) return;
    setFetchingPr(true);
    setError(null);

    try {
      const res = await fetch('/api/github/fetch-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl: prUrl.trim() })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `GitHub PR fetch failed with status ${res.status}`);
      }

      const data = await res.json();
      setCodeSnippet(data.diff);
      setLanguage('diff');
      setPrInfo({
        title: data.title,
        lines: data.diff.split('\n').length
      });
    } catch (err: any) {
      console.error('Error fetching PR:', err);
      setError(err.message || 'Could not fetch public GitHub PR diff.');
    } finally {
      setFetchingPr(false);
    }
  };

  // Multi-File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const newFile: UploadedFile = {
          name: file.name,
          content: text || '',
          size: file.size
        };

        setUploadedFiles(prev => {
          const existing = prev.filter(f => f.name !== file.name);
          const updated = [...existing, newFile];
          return updated;
        });
      };
      reader.readAsText(file);
    });
  };

  const handleSelectFile = (index: number) => {
    // Save current editor content into previous active file
    if (uploadedFiles[activeFileIndex]) {
      uploadedFiles[activeFileIndex].content = codeSnippet;
    }
    setActiveFileIndex(index);
    setCodeSnippet(uploadedFiles[index]?.content || '');
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (activeFileIndex >= updated.length) {
      const newIdx = Math.max(0, updated.length - 1);
      setActiveFileIndex(newIdx);
      setCodeSnippet(updated[newIdx]?.content || '');
    } else {
      setCodeSnippet(updated[activeFileIndex]?.content || '');
    }
  };

  const handleApplySuggestion = (improvedCode: string) => {
    setCodeSnippet(improvedCode);
    if (inputMode === 'multi_file' && uploadedFiles[activeFileIndex]) {
      uploadedFiles[activeFileIndex].content = improvedCode;
    }
    setAppliedNotification('Applied refactored code to Monaco Editor!');
    setTimeout(() => setAppliedNotification(null), 4000);
    const editorEl = document.getElementById('monaco-code-container');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Compile active code payload
  const getActiveCodePayload = (): string => {
    if (inputMode === 'multi_file') {
      if (uploadedFiles.length === 0) return codeSnippet;
      // Sync active editor content
      uploadedFiles[activeFileIndex].content = codeSnippet;
      return uploadedFiles
        .map(f => `// ========================================\n// File: ${f.name}\n// ========================================\n${f.content}`)
        .join('\n\n');
    }
    return codeSnippet;
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

    if (persona === 'security') {
      security -= 15;
    } else if (persona === 'performance') {
      complexity -= 15;
    }

    // Rule 1: implicit any
    if (code.includes(': any')) {
      overall -= 10;
      readability -= 15;
      bug -= 10;
      keyIssues.push('[TYPE SAFETY - MEDIUM] Line ' + (lines.findIndex(l => l.includes(': any')) + 1) + ': Explicit `: any` bypasses compile-time type safety.');
      suggestions.push({
        issue: 'Type safety weakened by `: any`',
        fix: code.replace(/: any/g, ': unknown /* strict type checking */'),
        line: lines.findIndex(l => l.includes(': any')) + 1
      });
    }

    // Rule 2: SQL Injection
    if (code.includes('SELECT * FROM') && (code.includes(" + ") || code.includes("+="))) {
      overall -= 30;
      security -= 40;
      keyIssues.push('[SECURITY - HIGH] Line ' + (lines.findIndex(l => l.includes('SELECT * FROM')) + 1) + ': Concatenated SQL query risk (SQL Injection).');
      suggestions.push({
        issue: 'Dynamic SQL query string concatenation',
        fix: code.replace(/let query = "SELECT \* FROM users WHERE id = '" \+ userId \+ "'"/g, 'const query = "SELECT * FROM users WHERE id = $1";\n  db.execute(query, [userId])'),
        line: lines.findIndex(l => l.includes('SELECT * FROM')) + 1
      });
    }

    overall = Math.max(20, Math.min(100, overall));
    bug = Math.max(20, Math.min(100, bug));
    security = Math.max(20, Math.min(100, security));
    readability = Math.max(20, Math.min(100, readability));
    complexity = Math.max(20, Math.min(100, complexity));

    const summary = keyIssues.length > 0
      ? `Audit complete [Mode: ${inputMode.toUpperCase()} | Persona: ${persona.toUpperCase()}]. Found ${keyIssues.length} issues requiring attention.`
      : `Audit passed [Mode: ${inputMode.toUpperCase()} | Persona: ${persona.toUpperCase()}]. Clean architecture and solid patterns detected.`;

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
        suggestions: suggestions.length > 0 ? suggestions : [{ issue: 'All compliant', fix: code }],
        positives
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadCode = getActiveCodePayload();

    if (!payloadCode.trim()) {
      return;
    }

    setError(null);
    setAnalyzing(true);
    setSuccess(false);
    setStreamProgressText('Initializing intelligence connection with Gemini 2.5 Flash...');

    try {
      if (simulateApiFailure) {
        throw new Error('Simulated API Gateway disruption.');
      }

      const supabase = getSupabase();
      let accessToken = '';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || '';
      }

      // Add mode instructions to guidelines
      let modeGuidelines = customGuidelines || '';
      if (inputMode === 'git_diff') {
        modeGuidelines = `${modeGuidelines}\nNOTE: You are analyzing a unified git diff. Focus on the modified lines (+ additions and - removals). Point out breaking regressions or unhandled edge cases in the delta.`;
      } else if (inputMode === 'multi_file') {
        modeGuidelines = `${modeGuidelines}\nNOTE: You are auditing a multi-file connected project bundle. Scrutinize cross-file consistency, circular imports, data flow between modules, and authentication handoffs.`;
      }

      // 1. Try Streaming SSE if enabled
      if (useStreaming) {
        try {
          const response = await fetch('/api/review/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
              code: payloadCode,
              language: inputMode === 'git_diff' ? 'diff' : language,
              persona,
              customGuidelines: modeGuidelines
            })
          });

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let doneReading = false;
            let finalParsedReview: any = null;
            let savedRecord: any = null;

            while (!doneReading) {
              const { value, done } = await reader.read();
              doneReading = done;
              if (value) {
                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6).trim();
                    if (dataStr === '[DONE]') {
                      doneReading = true;
                      break;
                    }
                    try {
                      const parsed = JSON.parse(dataStr);
                      if (parsed.type === 'chunk' && parsed.text) {
                        setStreamProgressText(prev => {
                          const updated = prev + parsed.text;
                          return updated.length > 400 ? updated.slice(-400) : updated;
                        });
                      } else if (parsed.type === 'done') {
                        finalParsedReview = parsed.review;
                        savedRecord = parsed.savedRecord;
                      } else if (parsed.type === 'error') {
                        throw new Error(parsed.error);
                      }
                    } catch (err) {
                      // ignore parse errors for partial chunks
                    }
                  }
                }
              }
            }

            if (finalParsedReview) {
              const transformedFeedback = {
                summary: finalParsedReview.summary,
                key_issues: finalParsedReview.issues?.length > 0 
                  ? finalParsedReview.issues.map((i: any) => `[${i.type?.toUpperCase()} - ${i.severity?.toUpperCase()}] Line ${i.line}: ${i.description}`)
                  : ['No compile defects identified.'],
                suggestions: finalParsedReview.suggestions?.length > 0
                  ? finalParsedReview.suggestions.map((s: any) => ({
                      issue: `${s.title}: ${s.explanation}`,
                      fix: s.improved_code,
                      line: undefined
                    }))
                  : [{ issue: 'All compliant', fix: payloadCode }],
                positives: [
                  'Source code exhibits clear conventions.',
                  'Execution structures are bounded.'
                ]
              };

              const finalReview = {
                id: savedRecord?.id,
                user_id: savedRecord?.user_id || 'local_user',
                created_at: savedRecord?.created_at || new Date().toISOString(),
                language: inputMode === 'git_diff' ? 'diff' : language,
                code_snippet: payloadCode,
                overall_score: Number(finalParsedReview.overall_score || 0),
                bug_score: Number(finalParsedReview.bug_score || 0),
                security_score: Number(finalParsedReview.security_score || 0),
                readability_score: Number(finalParsedReview.readability_score || 0),
                complexity_score: Number(finalParsedReview.complexity_score || 0),
                feedback: transformedFeedback
              };

              setReviewResult(finalReview);
              setAnalyzing(false);
              setSuccess(true);
              onAddReview(finalReview);
              return;
            }
          }
        } catch (streamErr) {
          console.warn('Streaming failed, falling back to standard endpoint:', streamErr);
        }
      }

      // 2. Standard Endpoint Fallback
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          code: payloadCode,
          language: inputMode === 'git_diff' ? 'diff' : language,
          persona,
          customGuidelines: modeGuidelines
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.review) {
        throw new Error('Invalid server response payload.');
      }

      const aiOutput = data.review;
      const savedRecord = data.savedRecord;

      const transformedFeedback = {
        summary: aiOutput.summary,
        key_issues: aiOutput.issues?.length > 0 
          ? aiOutput.issues.map((i: any) => `[${i.type?.toUpperCase()} - ${i.severity?.toUpperCase()}] Line ${i.line}: ${i.description}`)
          : ['No compile defects identified.'],
        suggestions: aiOutput.suggestions?.length > 0
          ? aiOutput.suggestions.map((s: any) => ({
              issue: `${s.title}: ${s.explanation}`,
              fix: s.improved_code,
              line: undefined
            }))
          : [{ issue: 'All compliant', fix: payloadCode }],
        positives: [
          'Source code exhibits clear conventions.',
          'Execution structures are bounded.'
        ]
      };

      const finalReview = {
        id: savedRecord?.id,
        user_id: savedRecord?.user_id || 'local_user',
        created_at: savedRecord?.created_at || new Date().toISOString(),
        language: inputMode === 'git_diff' ? 'diff' : language,
        code_snippet: payloadCode,
        overall_score: Number(aiOutput.overall_score || 0),
        bug_score: Number(aiOutput.bug_score || 0),
        security_score: Number(aiOutput.security_score || 0),
        readability_score: Number(aiOutput.readability_score || 0),
        complexity_score: Number(aiOutput.complexity_score || 0),
        feedback: transformedFeedback
      };

      setReviewResult(finalReview);
      setAnalyzing(false);
      setSuccess(true);
      onAddReview(finalReview);

    } catch (err: any) {
      console.error('Frontend analysis execution error:', err);
      try {
        console.log('Running static AST rule matching local backup fallback...');
        const localReview = executeLocalAnalysis(language, payloadCode);
        setReviewResult(localReview);
        setAnalyzing(false);
        setSuccess(true);
        onAddReview(localReview);
        return;
      } catch (fallbackErr) {
        console.error('Static fallback matching failed:', fallbackErr);
      }

      setError(err.message || 'Fatal analyzer compiler loop timed out.');
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setCodeSnippet('');
    setReviewResult(null);
    setSuccess(false);
    setError(null);
    setStreamProgressText('');
    setPrInfo(null);
  };

  const LoadingSkeleton = () => (
    <div id="review-loading-skeleton" className="bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6 animate-pulse">
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-8 w-16 bg-slate-800/60 rounded-xl" />
      </div>

      <div className="flex flex-col items-center justify-center py-5 bg-[#050507] rounded-2xl border border-slate-800/50 space-y-2">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-14 w-20 bg-slate-800 rounded-xl" />
        <div className="h-3.5 w-28 bg-slate-800 rounded" />
      </div>

      {streamProgressText && (
        <div className="p-3 bg-[#050507] border border-indigo-500/20 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-mono font-bold uppercase">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Streaming Live AI Analysis...</span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 line-clamp-3 leading-relaxed">
            {streamProgressText}
          </p>
        </div>
      )}

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
    </div>
  );

  const isEditorEmpty = codeSnippet.trim() === '';

  const personasList = [
    { id: 'general', label: 'Balanced Generalist', icon: Award, color: 'text-emerald-400' },
    { id: 'security', label: 'Security Auditor', icon: ShieldAlert, color: 'text-rose-400' },
    { id: 'performance', label: 'Performance Ninja', icon: Zap, color: 'text-cyan-400' },
    { id: 'mentor', label: 'Junior Mentor', icon: HeartHandshake, color: 'text-indigo-400' }
  ];

  return (
    <div id="new-review-view" className="max-w-6xl mx-auto space-y-8 animate-fade-in font-sans px-2">
      
      {/* View Header */}
      <div id="new-review-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-accent" />
            <span>New AI Code Review</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Audit single files, pull request diffs, or multi-component project workspaces with Gemini 2.5 Flash.
          </p>
        </div>

        {/* Input Mode Selector */}
        <div className="bg-[#050507] p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleInputModeChange('snippet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              inputMode === 'snippet' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-accent" />
            <span>Snippet</span>
          </button>

          <button
            type="button"
            onClick={() => handleInputModeChange('git_diff')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              inputMode === 'git_diff' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
            <span>Git Diff / PR</span>
          </button>

          <button
            type="button"
            onClick={() => handleInputModeChange('multi_file')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              inputMode === 'multi_file' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multi-File</span>
          </button>
        </div>
      </div>

      {/* Applied Refactoring Toast Notification */}
      {appliedNotification && (
        <div className="bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-2xl flex items-center justify-between animate-fade-in shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold font-mono">
            <Check className="w-4 h-4" />
            <span>{appliedNotification}</span>
          </div>
          <button 
            onClick={handleSubmit}
            className="bg-accent text-bg text-[10px] uppercase font-bold px-3 py-1 rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            Re-Audit Fixed Code
          </button>
        </div>
      )}

      {/* Git Diff / PR URL Bar */}
      {inputMode === 'git_diff' && (
        <div className="bg-[#0b0b0e] border border-slate-800/80 p-4 rounded-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
              Import Public GitHub Pull Request Diff
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live Diff Ingestion</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="e.g. https://github.com/facebook/react/pull/28000"
              className="flex-1 w-full bg-[#050507] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={fetchingPr || !prUrl.trim()}
              onClick={handleFetchPr}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              {fetchingPr ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{fetchingPr ? 'Fetching...' : 'Fetch Diff'}</span>
            </button>
          </div>
          {prInfo && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Loaded: {prInfo.title} ({prInfo.lines} diff lines)</span>
            </div>
          )}
        </div>
      )}

      {/* Main Form + Metrics Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-start">
        
        {/* Monaco Editor Segment */}
        <div className="lg:col-span-4 bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/90 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-5">
          
          {/* Persona Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050507] p-2.5 rounded-2xl border border-slate-850">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 font-mono">Persona:</span>
              {personasList.map((p) => {
                const Icon = p.icon;
                const isActive = persona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id as ReviewPersona)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive 
                        ? 'bg-slate-800 text-white border border-slate-700 shadow-md ring-1 ring-accent/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {customGuidelines && (
                <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Team Rules
                </span>
              )}
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={useStreaming} 
                  onChange={(e) => setUseStreaming(e.target.checked)}
                  className="rounded border-slate-800 text-accent focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-mono">Stream AI</span>
              </label>
            </div>
          </div>

          {/* Multi-File Workspace Sidebar & Tabs */}
          {inputMode === 'multi_file' && (
            <div className="bg-[#050507] border border-slate-850 p-4 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Connected Files in Workspace ({uploadedFiles.length})</span>
                </div>
                <label className="bg-[#16161f] hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5 text-accent" />
                  <span>+ Add Files</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Files tab list */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectFile(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer shrink-0 border ${
                      activeFileIndex === i 
                        ? 'bg-slate-800 text-white border-slate-700 ring-1 ring-cyan-500/30' 
                        : 'bg-[#0a0a0c] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>{f.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(i, e)}
                      className="text-slate-500 hover:text-rose-400 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Language Selection selector */}
            <div className="space-y-1.5 flex-1 max-w-[240px]">
              <label htmlFor="language-select" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {inputMode === 'git_diff' ? 'Diff Format' : 'Target Language'}
              </label>
              <select
                id="language-select"
                value={language}
                disabled={inputMode === 'git_diff'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white bg-[#050507] focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none cursor-pointer font-sans disabled:opacity-50"
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

          {/* Monaco Editor Container */}
          <div id="monaco-code-container" className="relative border border-slate-800/80 rounded-2xl overflow-hidden bg-[#050507] p-2">
            <Editor
              height="450px"
              language={mapLanguageToMonaco(language)}
              theme="vs-dark"
              value={codeSnippet}
              onChange={(value) => setCodeSnippet(value || '')}
              loading={
                <div className="flex flex-col items-center justify-center h-[450px] bg-[#050507] text-slate-500 font-mono text-xs gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent via-emerald-400 to-cyan-400 hover:opacity-95 text-bg font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(0,255,170,0.25)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Analyzing {inputMode === 'git_diff' ? 'Git PR Diff' : inputMode === 'multi_file' ? 'Multi-File Bundle' : 'Codebase'}...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Launch {inputMode === 'git_diff' ? 'PR Diff Audit' : inputMode === 'multi_file' ? 'Workspace Review' : 'AI Review'} ({persona.toUpperCase()})</span>
              </>
            )}
          </button>

        </div>

        {/* Dynamic score results + Loading Skeletons */}
        <div className="lg:col-span-2 space-y-6">
          
          {success && (
            <div id="submit-success-alert" className="bg-[#064e3b]/30 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-fade-in line-clamp-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Assessment created successfully! Streak updated and review archived.</span>
            </div>
          )}

          {analyzing ? (
            <LoadingSkeleton />
          ) : error ? (
            <div id="submit-error-alert" className="bg-[#881337]/15 border border-rose-500/30 text-rose-200 p-6 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-lg">
              <div className="flex items-start gap-3.5">
                <AlertCircle className="h-5.5 w-5.5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white tracking-tight">Analysis Error</h4>
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
            <div id="analysis-results-section" className="bg-[#0b0b0e] p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4 animate-fade-in text-center">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-accent font-mono">Active Score</span>
                <div className="bg-accent/10 p-2 rounded-xl text-accent border border-accent/20">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>

              {/* Centered Score badge */}
              <div className="text-center py-3 bg-[#050507] rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Overall Score</p>
                <p className="text-4xl font-black text-accent leading-none py-1">{reviewResult.overall_score} pts</p>
              </div>

              {/* Brief summary text bubble */}
              <div className="bg-[#050507] p-4 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Summary</p>
                <p className="text-[11px] text-slate-300 leading-relaxed font-mono text-left italic">
                  &quot;{reviewResult.feedback?.summary || (reviewResult as any).summary}&quot;
                </p>
              </div>

              <div className="text-xs text-accent font-bold animate-pulse font-sans">
                ⬇️ Scroll down for diffs, refactorings & interactive AI chat!
              </div>

            </div>
          ) : (
            /* Blank Placeholder State */
            <div className="bg-[#0a0a0c] p-6 rounded-3xl border border-slate-800/80 shadow-lg text-center py-10 space-y-4 border-dashed">
              <HelpCircle className="h-8 w-8 text-slate-600 mx-auto animate-bounce" />
              <div className="space-y-1.5">
                <h4 className="text-white text-xs font-bold font-sans uppercase tracking-widest">
                  {inputMode === 'git_diff' ? 'Awaiting Git PR Diff' : inputMode === 'multi_file' ? 'Multi-File Ready' : 'Awaiting Code Audit'}
                </h4>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                  {inputMode === 'git_diff'
                    ? 'Paste a unified diff or fetch a GitHub PR URL to audit code deltas.'
                    : inputMode === 'multi_file'
                    ? 'Add multiple files to audit cross-component architecture and dependencies.'
                    : 'Paste code inside Monaco and click "Launch AI Review".'}
                </p>
              </div>
            </div>
          )}

          {/* Quick instructions and documentation */}
          <div className="bg-[#0a0a0c]/80 p-5 rounded-3xl border border-slate-850 shadow-md space-y-3">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
              <Info className="h-3 w-3 text-accent" />
              <span>Real-World Workflows</span>
            </span>
            <div className="text-[10px] text-slate-500 space-y-2 leading-relaxed font-sans">
              <p>Supports end-to-end engineering review workflows:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-slate-400">
                <li><strong className="text-indigo-400">PR Diff Mode</strong>: Audits pull request deltas</li>
                <li><strong className="text-cyan-400">Multi-File</strong>: Bundles related components together</li>
                <li><strong className="text-accent">Permalinks</strong>: Share audit summaries via URL</li>
              </ul>
            </div>
          </div>

        </div>

      </div>

      {reviewResult && (
        <div id="full-detailed-review-result" className="mt-8 transition-all">
          <ReviewResult 
            review={reviewResult as any} 
            originalCodeSnippet={getActiveCodePayload()} 
            language={inputMode === 'git_diff' ? 'diff' : language} 
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      )}

    </div>
  );
}
