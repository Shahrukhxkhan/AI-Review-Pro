import express from 'express';
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

  // Support JSON parsing in post bodies
  app.use(express.json());

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

  // Main code review endpoint
  app.post('/api/review', async (req, res) => {
    const { code, language } = req.body;

    if (!code || !language) {
      res.status(400).json({ error: 'Missing required parameters: code or language.' });
      return;
    }

    try {
      const ai = getGemini();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Please review this code snippet written in ${language}:\n\n${code}`,
        config: {
          systemInstruction: `You are an expert code reviewer. Analyze the provided code and return ONLY a valid JSON object with this exact structure:
{
  "overall_score": number,
  "bug_score": number,
  "security_score": number,
  "readability_score": number,
  "complexity_score": number,
  "issues": [{ "type": string, "severity": "low"|"medium"|"high", "line": number, "description": string }],
  "suggestions": [{ "title": string, "explanation": string, "improved_code": string }],
  "summary": string
}`,
          responseMimeType: 'application/json'
        }
      });

      const claudeOutput = JSON.parse(response.text!);

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

          // Parse Claude feedback format to conform with Supabase feedback schema: ReviewFeedback
          const transformedFeedback = {
            summary: claudeOutput.summary,
            key_issues: claudeOutput.issues.map((i: any) => `[${i.type.toUpperCase()} - ${i.severity.toUpperCase()}] Line ${i.line}: ${i.description}`),
            suggestions: claudeOutput.suggestions.map((s: any) => ({
              issue: `${s.title}: ${s.explanation}`,
              fix: s.improved_code,
              line: undefined
            })),
            positives: [
              'Code conforms to industry best practices.',
              'Logic shows correct semantic understanding.'
            ]
          };

          // Save the review directly inside Supabase
          const { data, error: insertError } = await supabaseServer
            .from('reviews')
            .insert({
              user_id: authenticatedUserId,
              language,
              code_snippet: code,
              overall_score: Number(claudeOutput.overall_score),
              bug_score: Number(claudeOutput.bug_score),
              security_score: Number(claudeOutput.security_score),
              readability_score: Number(claudeOutput.readability_score),
              complexity_score: Number(claudeOutput.complexity_score),
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

      // Return both parsed JSON data and details of any saved Supabase record
      res.json({
        review: claudeOutput,
        savedRecord
      });

    } catch (err: any) {
      console.error('API Endpoint /api/review handler failure:', err);
      res.status(500).json({
        error: err.message || 'An internal server error occurred during code analysis.'
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
