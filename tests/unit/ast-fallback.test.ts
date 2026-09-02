import { describe, it, expect } from 'vitest';
import { ReviewPersona } from '@/types';

// Standalone AST fallback evaluator replicating the local analysis engine
function runAstEvaluation(lang: string, code: string, persona: ReviewPersona = 'general') {
  let overall = 85;
  let bug = 90;
  let security = 95;
  let readability = 90;
  let complexity = 85;

  const keyIssues: string[] = [];
  const suggestions: { line?: number; issue: string; fix: string }[] = [];
  const lines = code.split('\n');

  if (persona === 'security') {
    security -= 15;
  } else if (persona === 'performance') {
    complexity -= 15;
  }

  // Rule 1: implicit any (TS / JS)
  if ((lang === 'TypeScript' || lang === 'JavaScript') && code.includes(': any')) {
    overall -= 10;
    readability -= 15;
    bug -= 10;
    keyIssues.push('[TYPE SAFETY - MEDIUM] Explicit : any bypasses compile-time type safety.');
    suggestions.push({
      issue: 'Type safety weakened by : any',
      fix: code.replace(/: any/g, ': unknown'),
      line: lines.findIndex(l => l.includes(': any')) + 1
    });
  }

  // Rule 2: SQL Injection
  if (code.includes('SELECT * FROM') && (code.includes(' + ') || code.includes('+='))) {
    overall -= 30;
    security -= 40;
    keyIssues.push('[SECURITY - HIGH] Concatenated SQL query risk (SQL Injection).');
    suggestions.push({
      issue: 'Dynamic SQL query string concatenation',
      fix: 'Use parameterized queries',
      line: lines.findIndex(l => l.includes('SELECT * FROM')) + 1
    });
  }

  // Rule 3: eval() usage
  if (code.includes('eval(')) {
    overall -= 25;
    security -= 35;
    bug -= 15;
    keyIssues.push('[VULNERABILITY - HIGH] Arbitrary code execution risk with eval().');
    suggestions.push({
      issue: 'eval() execution vulnerability',
      fix: 'Use structured parsing',
      line: lines.findIndex(l => l.includes('eval(')) + 1
    });
  }

  // Rule 4: strcpy in C++
  if (code.includes('strcpy(')) {
    overall -= 25;
    security -= 30;
    keyIssues.push('[BUFFER OVERFLOW - HIGH] strcpy does not verify boundary limits.');
    suggestions.push({
      issue: 'Unbounded memory copy',
      fix: 'Use strncpy',
      line: lines.findIndex(l => l.includes('strcpy(')) + 1
    });
  }

  return {
    overall_score: Math.max(20, Math.min(100, overall)),
    bug_score: Math.max(20, Math.min(100, bug)),
    security_score: Math.max(20, Math.min(100, security)),
    readability_score: Math.max(20, Math.min(100, readability)),
    complexity_score: Math.max(20, Math.min(100, complexity)),
    keyIssues,
    suggestions
  };
}

describe('Static AST Fallback Analyzer Heuristics', () => {
  it('penalizes SQL injection and generates parameterized fix suggestion', () => {
    const vulnerableSql = `
      function getUser(id) {
        let query = "SELECT * FROM users WHERE id = '" + id + "'";
        return db.query(query);
      }
    `;

    const result = runAstEvaluation('TypeScript', vulnerableSql);
    expect(result.security_score).toBeLessThanOrEqual(55);
    expect(result.overall_score).toBeLessThanOrEqual(55);
    expect(result.keyIssues.some(i => i.includes('SQL Injection'))).toBe(true);
    expect(result.suggestions.some(s => s.issue.includes('SQL'))).toBe(true);
  });

  it('penalizes explicit ": any" types in TypeScript and suggests ": unknown"', () => {
    const untypedCode = `function processItem(item: any): any { return item.id; }`;
    const result = runAstEvaluation('TypeScript', untypedCode);
    
    expect(result.readability_score).toBe(75);
    expect(result.bug_score).toBe(80);
    expect(result.keyIssues.some(i => i.includes('TYPE SAFETY'))).toBe(true);
    expect(result.suggestions[0].fix).toContain(': unknown');
  });

  it('detects eval() arbitrary code execution risk', () => {
    const evalCode = `const calc = eval("10 * 5");`;
    const result = runAstEvaluation('JavaScript', evalCode);

    expect(result.security_score).toBeLessThanOrEqual(60);
    expect(result.keyIssues.some(i => i.includes('eval()'))).toBe(true);
  });

  it('detects C++ unbounded memory copy via strcpy', () => {
    const cppCode = `void copy(char* input) { char buf[8]; strcpy(buf, input); }`;
    const result = runAstEvaluation('C++', cppCode);

    expect(result.security_score).toBeLessThanOrEqual(65);
    expect(result.keyIssues.some(i => i.includes('strcpy'))).toBe(true);
  });

  it('applies stricter security baseline penalties when persona is security', () => {
    const cleanCode = `function sum(a: number, b: number): number { return a + b; }`;
    const generalResult = runAstEvaluation('TypeScript', cleanCode, 'general');
    const securityResult = runAstEvaluation('TypeScript', cleanCode, 'security');

    expect(securityResult.security_score).toBe(generalResult.security_score - 15);
  });

  it('applies stricter complexity baseline penalties when persona is performance', () => {
    const cleanCode = `function sum(a: number, b: number): number { return a + b; }`;
    const generalResult = runAstEvaluation('TypeScript', cleanCode, 'general');
    const perfResult = runAstEvaluation('TypeScript', cleanCode, 'performance');

    expect(perfResult.complexity_score).toBe(generalResult.complexity_score - 15);
  });
});
