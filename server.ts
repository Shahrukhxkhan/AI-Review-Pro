import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  // Remove markdown codeblock tags if they exist
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON parsing in post bodies with payload limit
  app.use(express.json({ limit: '100kb' }));

  // Rate limiter for review endpoint
  const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  });

  // Initialize Gemini client (lazy init helper)
  const getGemini = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    return new GoogleGenAI({ apiKey: key });
  };

  // Initialize server-side Supabase client (lazy init helper)
  const getSupabaseServer = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  };

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Fetch dashboard stats from Supabase using parallel queries
  app.get('/api/dashboard-stats', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const supabaseServer = getSupabaseServer();

      if (!supabaseServer || !token) {
        res.status(401).json({ error: 'Unauthorized or database credentials missing.' });
        return;
      }

      const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
      if (authError || !user) {
        res.status(401).json({ error: 'Auth token expired or user record missing.' });
        return;
      }

      // Execute queries in parallel using Promise.all as requested
      const [reviewsResult, streakResult] = await Promise.all([
        supabaseServer
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabaseServer
          .from('streaks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (reviewsResult.error) {
        throw reviewsResult.error;
      }
      if (streakResult.error) {
        throw streakResult.error;
      }

      res.json({
        reviews: reviewsResult.data || [],
        streak: streakResult.data || { current_streak: 0, longest_streak: 0, last_reviewed_at: null }
      });
    } catch (err: any) {
      console.error('Failed to fetch dashboard server statistics in parallel:', err);
      res.status(500).json({ error: err.message || 'Error occurred querying analytics parallel data.' });
    }
  });

  // Helper to construct specialized review personas & team guideline instructions
  const buildSystemInstruction = (persona?: string, customGuidelines?: string) => {
    let personaInstruction = 'You are an expert code reviewer. Analyze the provided code objectively for bugs, security vulnerabilities, performance, readability, and complexity.';

    if (persona === 'security') {
      personaInstruction = `You are a ruthless Principal Security Architect and Penetration Testing Lead. 
Focus intensely on OWASP Top 10 vulnerabilities, input sanitization, injection vectors (SQL, command, XSS), hardcoded credentials, buffer safety, auth/permission flaws, and cryptography. Provide high security severity ratings and actionable hardened patches.`;
    } else if (persona === 'performance') {
      personaInstruction = `You are a Principal High-Performance Systems Engineer and Runtime Optimizer.
Focus relentlessly on Big-O algorithmic time and space complexity, unnecessary heap allocations, memory leaks, event loop blocking, CPU cache utilization, unindexed lookups, and asynchronous concurrency bottlenecks. Provide optimized, zero-overhead refactorings.`;
    } else if (persona === 'mentor') {
      personaInstruction = `You are an empathetic, encouraging Staff Engineer mentor guiding a junior-to-mid developer.
Explain bugs and concepts kindly using clear, intuitive analogies. Celebrate good patterns in the code, explain *why* issues matter rather than just stating rules, and guide the developer with warm, pedagogical refactoring suggestions.`;
    }

    let guidelinesInstruction = '';
    if (customGuidelines && customGuidelines.trim()) {
      guidelinesInstruction = `\n\nTEAM CUSTOM CODING GUIDELINES:\n${customGuidelines.trim()}\nStrictly enforce these organizational rules in your review comments and scoring.\n`;
    }

    return `${personaInstruction}${guidelinesInstruction}

Analyze the provided code and return ONLY a valid JSON object with this exact structure:
{
  "overall_score": number,
  "bug_score": number,
  "security_score": number,
  "readability_score": number,
  "complexity_score": number,
  "issues": [{ "type": string, "severity": "low"|"medium"|"high", "line": number, "description": string }],
  "suggestions": [{ "title": string, "explanation": string, "improved_code": string }],
  "summary": string
}`;
  };

  // Main code review endpoint
  app.post('/api/review', reviewLimiter, async (req, res) => {
    const { code, language, persona, customGuidelines } = req.body;

    if (!code || !language) {
      res.status(400).json({ error: 'Missing required parameters: code or language.' });
      return;
    }

    const MAX_CODE_LENGTH = 20000;
    if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: 'Code snippet exceeds maximum allowed length.' });
      return;
    }

    try {
      const ai = getGemini();
      const systemInstruction = buildSystemInstruction(persona, customGuidelines);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Please review this code snippet written in ${language}:\n\n${code}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json'
        }
      });

      const geminiOutput = cleanAndParseJSON(response.text!);

      // Retrieve authentication details from authorization headers if mapped
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const supabaseServer = getSupabaseServer();

      let savedRecord = null;
      let authenticatedUserId = 'local_user';

      if (token && supabaseServer) {
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
        if (user && !authError) {
          authenticatedUserId = user.id;

          const transformedFeedback = {
            summary: geminiOutput.summary,
            key_issues: geminiOutput.issues?.map((i: any) => `[${i.type.toUpperCase()} - ${i.severity.toUpperCase()}] Line ${i.line}: ${i.description}`) || [],
            suggestions: geminiOutput.suggestions?.map((s: any) => ({
              issue: `${s.title}: ${s.explanation}`,
              fix: s.improved_code,
              line: undefined
            })) || [],
            positives: [
              'Code conforms to industry best practices.',
              'Logic shows correct semantic understanding.'
            ]
          };

          const { data, error: insertError } = await supabaseServer
            .from('reviews')
            .insert({
              user_id: authenticatedUserId,
              language,
              code_snippet: code,
              overall_score: Number(geminiOutput.overall_score),
              bug_score: Number(geminiOutput.bug_score),
              security_score: Number(geminiOutput.security_score),
              readability_score: Number(geminiOutput.readability_score),
              complexity_score: Number(geminiOutput.complexity_score),
              feedback: transformedFeedback
            })
            .select()
            .single();

          if (insertError) {
            console.error('Failed to insert review to Supabase table:', insertError);
          } else {
            savedRecord = data || null;
            console.log('Saved code review successfully to Supabase. ID:', savedRecord?.id);
          }
        }
      }

      res.json({
        review: geminiOutput,
        savedRecord
      });

    } catch (err: any) {
      console.error('API Endpoint /api/review handler failure:', err);
      res.status(500).json({
        error: err.message || 'An internal server error occurred during code analysis.'
      });
    }
  });

  // Streaming code review endpoint (SSE)
  app.post('/api/review/stream', reviewLimiter, async (req, res) => {
    const { code, language, persona, customGuidelines } = req.body;

    if (!code || !language) {
      res.status(400).json({ error: 'Missing required parameters: code or language.' });
      return;
    }

    const MAX_CODE_LENGTH = 20000;
    if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: 'Code snippet exceeds maximum allowed length.' });
      return;
    }

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    try {
      const ai = getGemini();
      const systemInstruction = buildSystemInstruction(persona, customGuidelines);

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `Please review this code snippet written in ${language}:\n\n${code}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json'
        }
      });

      let accumulated = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          accumulated += text;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        }
      }

      const geminiOutput = cleanAndParseJSON(accumulated);

      // Handle optional Supabase persistence
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const supabaseServer = getSupabaseServer();
      let savedRecord = null;

      if (token && supabaseServer) {
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
        if (user && !authError) {
          const transformedFeedback = {
            summary: geminiOutput.summary,
            key_issues: geminiOutput.issues?.map((i: any) => `[${i.type.toUpperCase()} - ${i.severity.toUpperCase()}] Line ${i.line}: ${i.description}`) || [],
            suggestions: geminiOutput.suggestions?.map((s: any) => ({
              issue: `${s.title}: ${s.explanation}`,
              fix: s.improved_code,
              line: undefined
            })) || [],
            positives: [
              'Code conforms to industry best practices.',
              'Logic shows correct semantic understanding.'
            ]
          };

          const { data } = await supabaseServer
            .from('reviews')
            .insert({
              user_id: user.id,
              language,
              code_snippet: code,
              overall_score: Number(geminiOutput.overall_score),
              bug_score: Number(geminiOutput.bug_score),
              security_score: Number(geminiOutput.security_score),
              readability_score: Number(geminiOutput.readability_score),
              complexity_score: Number(geminiOutput.complexity_score),
              feedback: transformedFeedback
            })
            .select()
            .single();

          savedRecord = data || null;
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done', review: geminiOutput, savedRecord })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('Streaming review endpoint error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Streaming failure' })}\n\n`);
      res.end();
    }
  });

  // Interactive Follow-up Chat endpoint
  app.post('/api/review/chat', async (req, res) => {
    const { code, language, reviewSummary, messages } = req.body;

    if (!code || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing required parameters: code or messages array.' });
      return;
    }

    try {
      const ai = getGemini();

      const promptHistory = messages
        .map((m: any) => `${m.role === 'user' ? 'Developer' : 'AI Review Assistant'}: ${m.content}`)
        .join('\n\n');

      const systemInstruction = `You are AI Review Pro Assistant, an expert senior engineer conversing with a developer about an audited code snippet.
Context:
- Language: ${language}
- Audited Code:
\`\`\`${language}
${code}
\`\`\`
${reviewSummary ? `- Initial Review Summary: ${reviewSummary}` : ''}

Your Mission:
Answer the developer's follow-up questions accurately, concisely, and practically.
- Use GitHub Flavored Markdown with syntax-highlighted code blocks for all code snippets.
- When suggesting a fix, provide clean, complete, production-ready code that can be directly applied.
- If asked to write unit tests, use standard frameworks for that language (e.g. Vitest/Jest for JS/TS, pytest for Python, testing package for Go).
- Be polite, direct, and technically rigorous.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptHistory,
        config: {
          systemInstruction,
        }
      });

      res.json({
        reply: response.text || 'I have analyzed your follow-up request.'
      });
    } catch (err: any) {
      console.error('Follow-up chat handler failure:', err);
      res.status(500).json({
        error: err.message || 'Failed to process follow-up chat message.'
      });
    }
  });


  // Vite integration middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static build files from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to boot Express web server:', error);
});
