import React, { useState } from 'react';
import { 
  Database, 
  Key, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Info,
  Clock,
  Check,
  X,
  Lock,
  GitBranch,
  Github,
  Monitor,
  Copy,
  User,
  LogOut
} from 'lucide-react';
import { Streak, DBUser } from '@/types';
import { getEnvKeys } from '@/lib/supabase';

interface SettingsViewProps {
  currentUser: DBUser | null;
  streak: Streak;
  onResetToSeed: () => void;
  onClearAll: () => void;
  onGithubLogin: () => void;
  onLogout: () => void;
  isSupabaseConnected: boolean;
}

export default function SettingsView({ 
  currentUser,
  streak,
  onResetToSeed, 
  onClearAll, 
  onGithubLogin,
  onLogout,
  isSupabaseConnected 
}: SettingsViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Warning triggers
  const [showSeedWarning, setShowSeedWarning] = useState(false);
  const [showClearWarning, setShowClearWarning] = useState(false);

  // Retrieve environment keys
  const envKeys = getEnvKeys();

  const handleCopyText = (label: string, textValue: string) => {
    if (!textValue) return;
    navigator.clipboard.writeText(textValue);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlSchemaScript = `-- SUPABASE CODES TABLE CREATIONS SCRIPT
create table if not exists public.users (
    id uuid references auth.users on delete cascade primary key,
    github_username text not null,
    email text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.reviews (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    language text not null,
    code_snippet text not null,
    overall_score integer not null,
    bug_score integer not null,
    security_score integer not null,
    readability_score integer not null,
    complexity_score integer not null,
    feedback jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.streaks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null unique,
    current_streak integer default 0 not null,
    longest_streak integer default 0 not null,
    last_reviewed_at timestamp with time zone
);

create table if not exists public.reports (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    type text not null,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    reviews_completed integer not null default 0,
    average_score numeric(5, 2) not null,
    most_common_issue text,
    improvement_percentage numeric(5, 2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;
alter table public.reviews enable row level security;
alter table public.streaks enable row level security;
alter table public.reports enable row level security;

create policy "Users can read their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can write their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can read their own reviews" on public.reviews for select using (auth.uid() = user_id);
create policy "Users can insert their own reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "Users can delete their own reviews" on public.reviews for delete using (auth.uid() = user_id);
create policy "Users can read their own streaks" on public.streaks for select using (auth.uid() = user_id);
create policy "Users can update their own streaks" on public.streaks for update using (auth.uid() = user_id);
create policy "Users can read their own reports" on public.reports for select using (auth.uid() = user_id);
create policy "Users can insert their own reports" on public.reports for insert with check (auth.uid() = user_id);`;

  return (
    <div id="settings-view" className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans">
      
      {/* View Header */}
      <div id="settings-title-section">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Manage your profile, account connections, and data preferences.</p>
      </div>

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left column (State and keys info) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/85 space-y-4 shadow-md">
            <h3 className="font-bold text-white flex items-center gap-2"><User className="h-4 w-4" /> Profile</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-500">
                {currentUser?.github_username?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-slate-100">{currentUser?.github_username || 'Anonymous User'}</p>
                <p className="text-xs text-slate-500">{currentUser?.email || 'No email associated'}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-xl border shrink-0
              ${isSupabaseConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/5 text-amber-500 border-amber-500/20'}`}
            >
              <Database className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Backend Connection Status</h3>
              <p className="text-slate-500 text-[10px] font-bold font-mono uppercase tracking-wider mt-0.5">
                Live cloud synchronizer sync state
              </p>
            </div>
          </div>

          {isSupabaseConnected ? (
            <div id="connected-alert" className="p-4 rounded-xl bg-emerald-500/5 text-emerald-350 text-xs border border-emerald-500/10 leading-relaxed space-y-2">
              <p className="font-extrabold flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                <span>Supabase cloud database is connected successfully!</span>
              </p>
              <p className="text-slate-450 leading-relaxed">
                Your developer reviews and streak metrics are persisted directly inside your private real-time Postgres instance. Logged in as: <code className="bg-slate-900 border border-slate-800 text-slate-300 font-bold px-1 py-0.5 rounded ml-1 font-mono">{currentUser?.github_username || 'anonymous'}</code>
              </p>
            </div>
          ) : (
            <div id="disconnected-alert" className="p-4 rounded-xl bg-slate-950/60 text-slate-300 text-xs border border-slate-800/80 leading-relaxed space-y-2">
              <p className="font-extrabold flex items-center gap-2 text-slate-400">
                <Info className="h-4.5 w-4.5 text-slate-500" />
                <span>Running in Offline persistence mode (Local Storage fallback)</span>
              </p>
              <p className="text-slate-500">
                No active variables detected in environment variables. The sandbox is maintaining a seamless offline mock simulation, saving evaluations inside the device's storage.
              </p>
              <p className="text-[11px] text-indigo-400/90 font-bold pt-1">
                💡 Set <code className="bg-slate-900 border border-slate-805 text-slate-300 px-1.5 py-0.5 rounded font-mono">VITE_PUBLIC_SUPABASE_URL</code> and <code className="bg-slate-900 border border-slate-805 text-slate-300 px-1.5 py-0.5 rounded font-mono">VITE_PUBLIC_SUPABASE_ANON_KEY</code> to enable remote syncing.
              </p>
            </div>
          )}
        </div>

        {/* Environmental bindings list */}
        <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/85 space-y-5 shadow-md">
          <div className="flex items-center space-x-3">
            <Key className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="font-extrabold text-white text-sm">Recognized Environmental Parameters</h3>
          </div>

          <div className="space-y-4 font-mono text-[10px]">
            
            {/* URL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center font-sans">
                <span className="font-bold text-slate-400">VITE_PUBLIC_SUPABASE_URL</span>
                <button 
                  onClick={() => handleCopyText('url', envKeys.supabaseUrl)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] cursor-pointer"
                >
                  {copiedKey === 'url' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <div className="bg-[#050507] p-2.5 rounded-lg border border-slate-850 text-slate-300 break-all select-all">
                {envKeys.supabaseUrl || <span className="font-sans italic text-slate-650">Empty (Not Configured)</span>}
              </div>
            </div>

            {/* Key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center font-sans">
                <span className="font-bold text-slate-400">VITE_PUBLIC_SUPABASE_ANON_KEY</span>
                <button 
                  onClick={() => handleCopyText('anon', envKeys.supabaseAnonKey)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] cursor-pointer"
                >
                  {copiedKey === 'anon' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <div className="bg-[#050507] p-2.5 rounded-lg border border-slate-850 text-slate-300 break-all select-all truncate">
                {envKeys.supabaseAnonKey || <span className="font-sans italic text-slate-650">Empty (Not Configured)</span>}
              </div>
            </div>

          </div>
        </div>

        {/* Database state managers */}
        <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/85 space-y-5 shadow-md">
          <div>
            <h3 className="font-extrabold text-white text-sm">Sandbox Cache Controllers</h3>
            <p className="text-slate-500 text-xs mt-0.5">Wipe logs, metrics, or reset seed states.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Button: Seed */}
            <div className="flex flex-col gap-2">
              {!showSeedWarning ? (
                <button
                  id="seed-state-btn"
                  onClick={() => setShowSeedWarning(true)}
                  className="inline-flex items-center justify-center gap-2 bg-[#050507] hover:bg-white/5 border border-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-indigo-400" />
                  <span>Load Default Seeds</span>
                </button>
              ) : (
                <div className="flex flex-col p-3 rounded-xl bg-indigo-950/10 border border-indigo-900/30 gap-2 animate-fade-in text-center">
                  <p className="text-[10px] text-indigo-300 font-semibold leading-tight">Replace draft listings with seed items?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        onResetToSeed();
                        setShowSeedWarning(false);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setShowSeedWarning(false)}
                      className="flex-1 bg-slate-900 text-slate-400 py-1.5 rounded-lg text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Button: Clear */}
            <div className="flex flex-col gap-2">
              {!showClearWarning ? (
                <button
                  id="clear-state-btn"
                  onClick={() => setShowClearWarning(true)}
                  className="inline-flex items-center justify-center gap-2 bg-[#1c080e] hover:bg-rose-950/20 border border-rose-900/50 text-rose-400 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Wipe Table Records</span>
                </button>
              ) : (
                <div className="flex flex-col p-3 rounded-xl bg-rose-950/20 border border-rose-905/35 gap-2 animate-fade-in text-center">
                  <p className="text-[10px] text-rose-300 font-semibold leading-tight">Irrerversible. Clean all evaluations?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        onClearAll();
                        setShowClearWarning(false);
                      }}
                      className="flex-1 bg-rose-700 hover:bg-rose-600 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer"
                    >
                      Clear Database
                    </button>
                    <button 
                      onClick={() => setShowClearWarning(false)}
                      className="flex-1 bg-slate-900 text-slate-400 py-1.5 rounded-lg text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Manual Sync Button */}
            <button className="inline-flex items-center justify-center gap-2 bg-[#050507] hover:bg-white/5 border border-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Manual Sync</span>
            </button>
            
            {/* Export Data Button */}
            <button className="inline-flex items-center justify-center gap-2 bg-[#050507] hover:bg-white/5 border border-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer">
              <Copy className="h-4 w-4 text-indigo-400" />
              <span>Export Data</span>
            </button>

          </div>
        </div>

        {/* Right column (Copy SQL and setup details) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Copier Code script SQL */}
          <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-slate-800/85 space-y-4 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-extrabold text-white text-sm">Postgres SQL Schema</h3>
              </div>
              <button 
                onClick={() => handleCopyText('sql', sqlSchemaScript)}
                className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 px-2 py-1.5 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedKey === 'sql' ? 'Copied script!' : 'Copy SQL'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Execute this query sequence inside your **Supabase &rarr; SQL Editor** to establish the requested schema and policies.
            </p>

            <div className="rounded-xl border border-slate-850 bg-slate-950 p-3 h-60 overflow-y-auto font-mono text-[10px] leading-relaxed select-all text-slate-400">
              <pre><code>{sqlSchemaScript}</code></pre>
            </div>
          </div>

          {/* GitHub Auth Instructions */}
          <div className="bg-[#0a0a0c] p-5 rounded-2xl border border-slate-800/85 shadow-md space-y-3.5">
            <div className="flex items-center gap-2">
              <Github className="h-4.5 w-4.5 text-slate-300" />
              <h3 className="font-extrabold text-white text-xs">Set up GitHub OAuth</h3>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Follow these simple steps in Supabase to link Github login features:
            </p>

            <div className="text-[11px] text-slate-400 space-y-2.5 font-sans leading-relaxed">
              <div className="flex gap-2.5">
                <span className="bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 h-fit text-slate-400">Step 1</span>
                <span>Create a new OAuth application inside **GitHub &rarr; Developer settings &rarr; OAuth Apps**.</span>
              </div>
              <div className="flex gap-2.5">
                <span className="bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 h-fit text-slate-400">Step 2</span>
                <span>Bind Callback route to: <code className="bg-slate-950 text-indigo-300 px-1 py-0.5 font-mono text-[10px] break-all border border-slate-900">https://your-ref.supabase.co/auth/v1/callback</code></span>
              </div>
              <div className="flex gap-2.5">
                <span className="bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 h-fit text-slate-400">Step 3</span>
                <span>Go to **Supabase Auth &rarr; Providers &rarr; GitHub**, toggle enabled, and input client ID & credentials.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
