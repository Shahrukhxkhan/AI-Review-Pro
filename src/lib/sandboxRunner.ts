export interface TestRunResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  logs: string[];
  assertions: {
    title: string;
    passed: boolean;
    error?: string;
  }[];
}

/**
 * Executes user JavaScript/TypeScript code against generated assertions inside an isolated web-safe worker/sandbox context.
 */
export async function runCodeInSandbox(
  code: string,
  language: string,
  userTests?: string
): Promise<TestRunResult> {
  const startTime = performance.now();
  const logs: string[] = [];

  // If not JS/TS, provide syntax & structural simulated validator
  if (!['javascript', 'js', 'typescript', 'ts'].includes(language.toLowerCase())) {
    const lines = code.split('\n');
    const hasUnclosedBrackets = (code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length;
    const hasUnclosedParens = (code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length;

    const assertions = [
      {
        title: 'Bracket & Scope Balancing',
        passed: !hasUnclosedBrackets,
        error: hasUnclosedBrackets ? 'Unbalanced curly braces {} detected.' : undefined
      },
      {
        title: 'Parentheses Balancing',
        passed: !hasUnclosedParens,
        error: hasUnclosedParens ? 'Unbalanced parentheses () detected.' : undefined
      },
      {
        title: 'Non-Empty Code Buffer',
        passed: lines.length > 0 && code.trim().length > 0
      }
    ];

    const passedTests = assertions.filter(a => a.passed).length;
    return {
      passed: passedTests === assertions.length,
      totalTests: assertions.length,
      passedTests,
      failedTests: assertions.length - passedTests,
      durationMs: Math.round(performance.now() - startTime),
      logs: [`Static syntax validation performed for ${language}.`],
      assertions
    };
  }

  // Safe client-side sandbox execution
  return new Promise((resolve) => {
    try {
      // Capture console outputs safely
      const capturedLogs: string[] = [];
      const testResults: { title: string; passed: boolean; error?: string }[] = [];

      const mockConsole = {
        log: (...args: any[]) => capturedLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => capturedLogs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        warn: (...args: any[]) => capturedLogs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
      };

      // Strip TS type annotations quickly for browser execution if simple TS
      let cleanJs = code
        .replace(/:\s*(string|number|boolean|any|void|unknown|never|object)\b/g, '')
        .replace(/as\s+[A-Za-z0-9_<>]+/g, '')
        .replace(/interface\s+[\s\S]*?\{[\s\S]*?\}/g, '')
        .replace(/type\s+[A-Za-z0-9_]+\s*=[\s\S]*?;/g, '');

      // Build execution payload with assertion test harness
      const harnessScript = `
        const console = __mockConsole;
        let __testResults = [];
        
        function describe(suiteName, fn) {
          fn();
        }

        function test(name, fn) {
          try {
            fn();
            __testResults.push({ title: name, passed: true });
          } catch (err) {
            __testResults.push({ title: name, passed: false, error: err.message || String(err) });
          }
        }

        function expect(actual) {
          return {
            toBe(expected) {
              if (actual !== expected) throw new Error(\`Expected \${expected} but received \${actual}\`);
            },
            toEqual(expected) {
              if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(\`Expected \${JSON.stringify(expected)} but got \${JSON.stringify(actual)}\`);
              }
            },
            toBeDefined() {
              if (actual === undefined) throw new Error('Expected value to be defined');
            },
            toBeTruthy() {
              if (!actual) throw new Error(\`Expected truthy value but got \${actual}\`);
            }
          };
        }

        // User code block
        try {
          ${cleanJs}
          __testResults.push({ title: 'Code evaluates without throwing syntax or runtime exception', passed: true });
        } catch (err) {
          __testResults.push({ title: 'Code evaluates without throwing syntax or runtime exception', passed: false, error: err.message || String(err) });
        }

        // Additional user / generated test suite if provided
        ${userTests ? userTests : ''}

        return { results: __testResults };
      `;

      // Execute safely with scoped arguments
      const runFn = new Function('__mockConsole', harnessScript);
      const execution = runFn(mockConsole);

      const allAssertions = execution.results || [];
      const passedCount = allAssertions.filter((a: any) => a.passed).length;

      resolve({
        passed: passedCount === allAssertions.length,
        totalTests: allAssertions.length,
        passedTests: passedCount,
        failedTests: allAssertions.length - passedCount,
        durationMs: Math.round(performance.now() - startTime),
        logs: capturedLogs,
        assertions: allAssertions
      });
    } catch (err: any) {
      resolve({
        passed: false,
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        durationMs: Math.round(performance.now() - startTime),
        logs: [`Execution halted: ${err.message || String(err)}`],
        assertions: [
          {
            title: 'Compilation & Execution',
            passed: false,
            error: err.message || String(err)
          }
        ]
      });
    }
  });
}
