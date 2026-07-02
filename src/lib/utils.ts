import { CodeReview, DashboardStats } from '@/types';

/**
 * Enterprise seed reviews representing realistic code feedback 
 * with granular scores and structured JSON metadata.
 */
export const SEED_REVIEWS: CodeReview[] = [
  {
    id: 'f8b1a37c-3f9e-4a6c-9d1a-5b6c7d8e9f01',
    user_id: 'usr_placeholder_1',
    language: 'TypeScript',
    code_snippet: `// Processes raw payload input list
function processUsers(users: any[]) {
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user.active == true) {
      console.log("Processing active user: " + user.name);
      
      // Nesting callback triggers parallel race conditions
      fetch("/api/process?id=" + user.id).then(res => {
        res.json().then(data => {
          console.log("Done for user " + user.id, data);
        })
      });
    }
  }
}`,
    overall_score: 68,
    bug_score: 75,
    security_score: 60,
    readability_score: 85,
    complexity_score: 50,
    feedback: {
      summary: 'The code achieves its goal of filtering and processing active users, but suffers from typing compromises, callback nesting, and insecure endpoint requests.',
      key_issues: [
        'Use of "any[]" type disables TypeScript compile-time type verification.',
        'Promise callbacks nested inside the forloop create unhandled processes prone to race conditions.',
        'String concatenation in API request parameter may permit route manipulations.'
      ],
      suggestions: [
        {
          line: 2,
          issue: 'Typing uses "any[]" which defeats TypeScript check safeguards.',
          fix: 'Define a specific Interface structure: e.g. interface User { id: string; active: boolean; name: string; }'
        },
        {
          line: 9,
          issue: 'Nested Promise handlers inside loop. Fetches execute concurrently without sequence locks.',
          fix: 'Refactor using async/await paired with Promise.all() to trigger calls safely.'
        }
      ],
      positives: [
        'Straightforward looping logic with early loop termination checks.',
        'Descriptive variable terms that speed up readability.'
      ]
    },
    created_at: '2026-06-20T15:45:00Z'
  },
  {
    id: 'a9c2b48e-2d8f-4b7c-8e2b-6c7d8e9f0a12',
    user_id: 'usr_placeholder_1',
    language: 'Python',
    code_snippet: `import hashlib

def hash_user_password(password):
    # Weak MD5 hashing algorithm without random salt
    hashed = hashlib.md5(password.encode()).hexdigest()
    return hashed

def query_user_from_db(db_cursor, username):
    # Prone to immediate unauthorized custom command inject
    query = "SELECT * FROM users WHERE username = '%s'" % username
    db_cursor.execute(query)
    return db_cursor.fetchall()`,
    overall_score: 32,
    bug_score: 80,
    security_score: 10,
    readability_score: 90,
    complexity_score: 85,
    feedback: {
      summary: 'Highly insecure architecture. Exposes user credentials to dictionary lookup attacks and permits direct Remote SQL Injections through unparameterized string insertion.',
      key_issues: [
        'MD5 has long been cryptographically insecure, suffering from rapid block collision matches.',
        'Absence of custom crypto salt permits rainbow-table brute force matching.',
        'SQL parameters formatting uses Python format operator instead of prepared query placeholders.'
      ],
      suggestions: [
        {
          line: 5,
          issue: 'Hashed storage with MD5 algorithm is weak and broken.',
          fix: 'Adopt Argon2, bcrypt, or PBKDF2 with standard securely salted cycles.'
        },
        {
          line: 10,
          issue: 'String formatted parameter leads to SQL Injection vulnerabilities.',
          fix: 'Use prepared token structures: db_cursor.execute("SELECT * FROM users WHERE username = %s", (username,))'
        }
      ],
      positives: [
        'PEP-8 styling conventions are strictly adhered to.',
        'Explicit string encoders prevent local decode errors.'
      ]
    },
    created_at: '2026-06-18T10:12:00Z'
  },
  {
    id: 'e4d5f6a7-1b2c-3d4e-5f6a-7b8c9d0e1f23',
    user_id: 'usr_placeholder_1',
    language: 'Go',
    code_snippet: `package main

import (
    "fmt"
    "net/http"
)

// Global map accessed by concurrent web routines has race conditions
var cache = make(map[string]string)

func handleRequest(w http.ResponseWriter, r *http.Request) {
    key := r.URL.Query().Get("key")
    if val, ok := cache[key]; ok {
        fmt.Fprintf(w, "Value: %s", val)
        return
    }
    
    val := r.URL.Query().Get("value")
    cache[key] = val
    fmt.Fprintf(w, "Saved key %s", key)
}`,
    overall_score: 55,
    bug_score: 40,
    security_score: 75,
    readability_score: 95,
    complexity_score: 70,
    feedback: {
      summary: 'Excellent Go idiomatic structure, but reading/writing a standard map inside a concurrent HTTP request handler thread creates a critical runtime panic hazard.',
      key_issues: [
        'Go maps are NOT concurrent-safe. Under moderate load, concurrent accesses will trigger a runtime crash.',
        'Lack of route parameter validation allows empty key query inputs to overwrite maps.'
      ],
      suggestions: [
        {
          line: 9,
          issue: 'Global raw hashmap is queried across multiple HTTP request routines.',
          fix: 'Protect the map access with sync.RWMutex or use sync.Map utility.'
        }
      ],
      positives: [
        'Native standard libraries utilized instead of heavy dependencies.',
        'Go idiomatic error returns are handled cleanly.'
      ]
    },
    created_at: '2026-06-15T14:30:00Z'
  }
];

/**
 * Calculates overall dashboard aggregated statistics from a set of code reviews
 */
export function calculateStats(reviews: CodeReview[]): DashboardStats {
  if (reviews.length === 0) {
    return {
      averageOverall: 0,
      totalReviews: 0,
      activeStreak: 0,
      longestStreak: 0,
      languageDistribution: [],
      scoreTrends: [],
      averageDimensionScores: {
        bugs: 0,
        security: 0,
        readability: 0,
        complexity: 0
      }
    };
  }

  const totalReviews = reviews.length;
  const totalOverall = reviews.reduce((sum, r) => sum + r.overall_score, 0);
  const averageOverall = parseFloat((totalOverall / totalReviews).toFixed(1));

  // Dimension totals
  const totalBugs = reviews.reduce((sum, r) => sum + r.bug_score, 0);
  const totalSec = reviews.reduce((sum, r) => sum + r.security_score, 0);
  const totalRead = reviews.reduce((sum, r) => sum + r.readability_score, 0);
  const totalComp = reviews.reduce((sum, r) => sum + r.complexity_score, 0);

  const averageDimensionScores = {
    bugs: Math.round(totalBugs / totalReviews),
    security: Math.round(totalSec / totalReviews),
    readability: Math.round(totalRead / totalReviews),
    complexity: Math.round(totalComp / totalReviews)
  };

  // Group by language
  const languageMap: Record<string, number> = {};
  reviews.forEach(r => {
    languageMap[r.language] = (languageMap[r.language] || 0) + 1;
  });

  const languageDistribution = Object.keys(languageMap).map(name => ({
    name,
    value: languageMap[name]
  }));

  // Group by creation chronological score trends
  const scoreTrends = reviews
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(r => ({
      date: formatDate(r.created_at),
      overall: r.overall_score,
      complexity: r.complexity_score
    }));

  return {
    averageOverall,
    totalReviews,
    activeStreak: 3, // Initial defaults
    longestStreak: 5,
    languageDistribution,
    scoreTrends,
    averageDimensionScores
  };
}

/**
 * Formats ISO timestamps into beautiful, human-readable dates
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Truncates long strings gracefully for lists
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Safely writes local storage wrapper
 */
export function saveToLocal(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving to localStorage', e);
  }
}

/**
 * Safely reads local storage wrapper
 */
export function loadFromLocal<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed loading from localStorage', e);
    return defaultValue;
  }
}
