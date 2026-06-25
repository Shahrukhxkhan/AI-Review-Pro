export interface Report {
  id: string; // uuid PK
  user_id: string; // FK
  type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  reviews_completed: number;
  average_score: number;
  most_common_issue: string;
  improvement_percentage: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'streak_risk' | 'achievement' | 'report_generated' | 'sync_failure';
  read: boolean;
  created_at: string;
}

export interface DBUser {
  id: string; // uuid PK
  github_username: string;
  email: string;
  created_at: string;
}

export interface ReviewFeedback {
  summary: string;
  key_issues: string[];
  suggestions: {
    line?: number;
    issue: string;
    fix: string;
  }[];
  positives: string[];
}

export interface CodeReview {
  id: string; // uuid PK
  user_id: string; // FK
  language: string;
  code_snippet: string;
  overall_score: number;
  bug_score: number;
  security_score: number;
  readability_score: number;
  complexity_score: number;
  feedback: ReviewFeedback;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_reviewed_at: string | null;
}

export interface DashboardStats {
  averageOverall: number;
  totalReviews: number;
  activeStreak: number;
  longestStreak: number;
  languageDistribution: { name: string; value: number }[];
  scoreTrends: { date: string; overall: number; complexity: number }[];
  averageDimensionScores: {
    bugs: number;
    security: number;
    readability: number;
    complexity: number;
  };
}

export interface AppSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  anthropicApiKey: string;
  useLocalStorageFallback: boolean;
}
