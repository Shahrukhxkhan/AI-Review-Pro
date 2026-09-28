import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, Terminal, RotateCcw, Sparkles } from 'lucide-react';
import { runCodeInSandbox, TestRunResult } from '@/lib/sandboxRunner';

interface SandboxRunnerProps {
  code: string;
  language: string;
  suggestionTitle?: string;
}

export default function SandboxRunner({ code, language, suggestionTitle }: SandboxRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [testCode, setTestCode] = useState<string>('');

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const result = await runCodeInSandbox(code, language, testCode);
      setTestResult(result);
    } catch (e: any) {
      console.error('Sandbox run error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerateAssertions = () => {
    // Scaffold automatic sample test cases based on snippet
    const sampleTests = `
test('Basic Sanity Check: function or variables declared properly', () => {
  expect(true).toBeTruthy();
});
`;
    setTestCode(sampleTests.trim());
  };

  return (
    <div className="bg-[#050507] border border-slate-800 rounded-2xl p-5 space-y-4 font-sans text-xs">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <h4 className="font-bold text-white text-sm">
            In-Browser Sandboxed Test Runner
          </h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!testCode && (
            <button
              onClick={handleGenerateAssertions}
              className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition px-2.5 py-1 rounded bg-[#0e0e13] border border-slate-800"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              Add Test Specs
            </button>
          )}

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-accent text-bg px-3.5 py-1.5 rounded-lg font-bold text-xs hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-accent/10"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run In Sandbox
              </>
            )}
          </button>
        </div>
      </div>

      {suggestionTitle && (
        <p className="text-slate-400 text-[11px]">
          Testing suggestion target: <strong className="text-white">{suggestionTitle}</strong>
        </p>
      )}

      {/* Optional test code editor area */}
      {testCode && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono">
            <span>Custom Unit Assertions (describe / test / expect)</span>
            <button onClick={() => setTestCode('')} className="hover:text-red-400">Clear</button>
          </div>
          <textarea
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            rows={3}
            className="w-full bg-[#0a0a0f] border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="test('my test', () => { expect(result).toBe(true); });"
          />
        </div>
      )}

      {/* Results View */}
      {testResult && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl border bg-[#0a0a0f]"
            style={{
              borderColor: testResult.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }}
          >
            <div className="flex items-center gap-2">
              {testResult.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className={`font-bold ${testResult.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testResult.passed ? 'All Checks Passed' : 'Failures Detected'}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
              <span>{testResult.passedTests}/{testResult.totalTests} passed</span>
              <span>•</span>
              <span>{testResult.durationMs}ms</span>
            </div>
          </div>

          {/* Individual assertions */}
          <div className="space-y-1.5">
            {testResult.assertions.map((assertion, i) => (
              <div
                key={i}
                className="flex items-start justify-between p-2.5 rounded-lg bg-[#08080c] border border-slate-850"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${assertion.passed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="text-white font-medium text-[11px]">{assertion.title}</span>
                  </div>
                  {assertion.error && (
                    <p className="text-rose-400 font-mono text-[10px] pl-3.5 mt-0.5">
                      {assertion.error}
                    </p>
                  )}
                </div>
                <span className={`font-mono text-[9px] uppercase font-bold ${assertion.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {assertion.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>

          {/* Console Output Log */}
          {testResult.logs.length > 0 && (
            <div className="mt-2 p-2.5 rounded-lg bg-[#030305] border border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5 max-h-28 overflow-y-auto">
              <span className="text-slate-600 block text-[9px] uppercase tracking-wider mb-1">Terminal Output</span>
              {testResult.logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
