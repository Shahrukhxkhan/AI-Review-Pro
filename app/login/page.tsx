'use client';

import React from 'react';
import { Github, MessageSquare, Terminal, Shield, Sparkles, Activity } from 'lucide-react';

interface LoginPageProps {
  onGithubLogin: () => void;
  isLoading?: boolean;
}

export default function LoginPage({ onGithubLogin, isLoading = false }: LoginPageProps) {
  return (
    <div 
      id="login-page-container" 
      className="min-h-[80vh] flex flex-col justify-center items-center px-4 font-sans max-w-lg mx-auto py-12 animate-fade-in"
    >
      <div 
        id="login-card" 
        className="w-full bg-[#0a0a0c] p-8 md:p-10 rounded-3xl border border-slate-800/90 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-8 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand logo / header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase font-mono bg-indigo-400/5 px-2.5 py-1 rounded-full border border-indigo-505/20">
              AI-Powered Code Analysis Suite
            </span>
            <h1 className="text-3xl font-black text-white mt-3 tracking-tight">
              AI-Review Pro
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed max-w-sm">
              Level up your repositories. Identify syntax bugs, find severe security gaps, and automate pull-request feedback logs.
            </p>
          </div>
        </div>

        {/* Feature Checkouts */}
        <div id="login-features-list" className="space-y-4 border-t border-b border-slate-800/60 py-6 font-sans">
          
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-white text-xs font-bold font-sans">AI Code Evaluation</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                Analyze snippet complexity, readability, and security checks across 6 languages.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-white text-xs font-bold font-sans">Gamified Streak Milestones</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                Accumulate active consecutive checkins. Drive continuous improvements with detailed logs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/10 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-white text-xs font-bold font-sans">Durable Postgres Cloud Sync</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                Maintain reviews and logs safely across devices with real-time Supabase integrations.
              </p>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="space-y-4">
          <button
            id="github-login-btn"
            onClick={onGithubLogin}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-white hover:to-white text-slate-300 hover:text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_4px_15px_rgba(0,0,0,0.4)] border border-slate-800 hover:border-white cursor-pointer disabled:opacity-55"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Github className="h-5 w-5 fill-current shrink-0" />
            )}
            <span>Continue with GitHub</span>
          </button>
          
          <p className="text-center text-[10px] text-slate-500 font-mono tracking-wider">
            SECURE POPUP AUTHENTICATION VIA SUPABASE AUTH
          </p>
        </div>

      </div>

      {/* Atmospheric blurred sphere in background */}
      <div className="w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] absolute pointer-events-none -z-10" />
    </div>
  );
}
