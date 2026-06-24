'use client';

import React, { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const supabase = getSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      // Small pause to allow hash/token parsing by Supabase Client
      setTimeout(() => {
        try {
          if (window.opener) {
            // Signal success to the parent AI Studio frame
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            
            // Give parent brief moment before self-closing
            setTimeout(() => {
              window.close();
            }, 600);
          } else {
            // Fallback: If not opened in a popup (e.g. redirected full tab), redirect to home page
            window.location.href = '/';
          }
        } catch (e) {
          console.error('Error on AuthCallbackPage process:', e);
          window.location.href = '/';
        }
      }, 500);
    };

    handleCallback();
  }, [supabase]);

  return (
    <div id="auth-callback-container" className="min-h-screen bg-[#020203] flex items-center justify-center text-slate-300 font-sans p-6">
      <div className="bg-[#0a0a0c] p-8 md:p-10 rounded-3xl border border-slate-800 text-center space-y-5 max-w-sm w-full shadow-2xl">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <h2 className="text-white text-lg font-bold">Verifying GitHub Credentials</h2>
          <p className="text-slate-505 text-xs">Completing secure handshake. This panel should close automatically...</p>
        </div>
      </div>
    </div>
  );
}
