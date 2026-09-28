import React, { useState } from 'react';
import { GitPullRequest, GitBranch, Check, ExternalLink, AlertCircle, X, Loader2 } from 'lucide-react';

interface CreatePrModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  improvedCode: string;
  language: string;
  suggestionTitle: string;
}

export default function CreatePrModal({
  isOpen,
  onClose,
  originalCode,
  improvedCode,
  language,
  suggestionTitle
}: CreatePrModalProps) {
  const [repo, setRepo] = useState('');
  const [branchName, setBranchName] = useState(`refactor/${suggestionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`);
  const [filePath, setFilePath] = useState(`src/index.${language === 'TypeScript' ? 'ts' : language === 'Python' ? 'py' : 'js'}`);
  const [commitMessage, setCommitMessage] = useState(`fix: apply AI suggestion for ${suggestionTitle}`);
  const [prTitle, setPrTitle] = useState(`refactor: ${suggestionTitle}`);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('ai_review_github_token') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultUrl(null);

    if (!repo.includes('/')) {
      setError('Repository must be in "owner/repo" format (e.g. facebook/react)');
      return;
    }

    if (!githubToken.trim()) {
      // Local fallback generation: Build a direct GitHub "compare & create PR" prefilled URL
      const [owner, repoName] = repo.split('/');
      const encodedTitle = encodeURIComponent(prTitle);
      const encodedBody = encodeURIComponent(`### 🤖 Automated AI Refactor PR\n\n**Suggestion:** ${suggestionTitle}\n\nGenerated via [AI-Review Pro](https://github.com).\n\n\`\`\`${language.toLowerCase()}\n${improvedCode}\n\`\`\``);
      const directGithubUrl = `https://github.com/${owner}/${repoName}/compare?expand=1&title=${encodedTitle}&body=${encodedBody}`;
      
      setResultUrl(directGithubUrl);
      return;
    }

    // Save token for next time
    localStorage.setItem('ai_review_github_token', githubToken.trim());
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          branchName,
          filePath,
          commitMessage,
          prTitle,
          prBody: `### 🤖 Automated AI Refactor PR\n\n**Suggestion:** ${suggestionTitle}\n\nVerified and proposed by **AI-Review Pro**.\n\n\`\`\`${language.toLowerCase()}\n${improvedCode}\n\`\`\``,
          content: improvedCode,
          token: githubToken.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create PR via GitHub API');
      }

      setResultUrl(data.prUrl);
    } catch (err: any) {
      console.error('Failed to create PR:', err);
      setError(err.message || 'Failed to dispatch GitHub API request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#0b0b0e] border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">1-Click Branch & PR Creation</h3>
              <p className="text-xs text-slate-400 mt-0.5">Commit this refactor into a new branch and open a GitHub PR</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultUrl ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check className="w-4 h-4" />
                Pull Request Ready!
              </div>
              <p className="text-xs text-slate-300">
                Your branch and PR draft have been generated. Click the button below to view or submit directly on GitHub.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-accent text-bg px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition shadow-lg shadow-accent/15"
              >
                Open on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePr} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px] block">Repository (owner/repo)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. octocat/hello-world"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full bg-[#121218] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px] block">Target File Path</label>
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  className="w-full bg-[#121218] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-purple-400" /> New Branch Name
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full bg-[#121218] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] block">PR Title</label>
              <input
                type="text"
                required
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="w-full bg-[#121218] border border-slate-800 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-mono text-[11px]">GitHub Personal Access Token (Optional)</label>
                <span className="text-[10px] text-slate-500">Leave blank for 1-click web diff draft</span>
              </div>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx (Requires repo scope for automated API commits)"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full bg-[#121218] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent text-bg px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-accent/15"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publishing PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-3.5 h-3.5" />
                    Generate & Open PR
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
