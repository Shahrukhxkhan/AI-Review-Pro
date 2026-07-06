import React from 'react';

interface LoginViewProps {
  onGithubLogin: () => void;
}

export default function LoginView({ onGithubLogin }: LoginViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-ink">
      <h1 className="text-4xl font-display mb-8">Welcome to AI-Review Pro</h1>
      <button 
        onClick={onGithubLogin}
        className="bg-accent text-bg px-6 py-3 rounded font-bold uppercase tracking-wider hover:opacity-90"
      >
        Login with GitHub
      </button>
    </div>
  );
}
