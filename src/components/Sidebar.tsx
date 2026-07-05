import React from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  History, 
  TrendingUp, 
  Settings,
  LogOut,
  FileText
} from 'lucide-react';
import { DBUser } from '@/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: (DBUser & { avatar_url?: string; role?: string }) | null;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, currentUser, onLogout }: SidebarProps) {

  const mainNav = [
    { name: 'Dashboard', tab: 'dashboard', icon: LayoutDashboard },
    { name: 'New review', tab: 'new-review', icon: Plus },
    { name: 'History', tab: 'history', icon: History },
  ];

  const analyticsNav = [
    { name: 'Progress', tab: 'progress', icon: TrendingUp },
    { name: 'Reports', tab: 'reports', icon: FileText },
    { name: 'Settings', tab: 'settings', icon: Settings },
  ];

  return (
    <aside className="bg-bg border-r border-ink-faint flex flex-col p-8 justify-between">
      <div className="top-sec">
        <div className="brand">
          <h1 className="font-display text-xl tracking-tight text-accent uppercase">AI-Review Pro</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mt-1">Code Intelligence [v2.4]</p>
        </div>
        <nav className="mt-12 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-30 mb-4 block">01 // System</span>
          <div className="space-y-2">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`flex items-center gap-3 w-full py-3 text-[14px] transition ${
                    isActive ? 'text-accent opacity-100' : 'text-ink opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </button>
              );
            })}
          </div>
          
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-30 mt-8 mb-4 block">02 // Analytics</span>
          <div className="space-y-2">
            {analyticsNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`flex items-center gap-3 w-full py-3 text-[14px] transition ${
                    isActive ? 'text-accent opacity-100' : 'text-ink opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
      
      {currentUser && (
        <div className="pt-8 border-t border-ink-faint flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-[12px] font-bold text-bg">
            {currentUser.github_username?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[12px] font-semibold text-ink">Shahrukh</p>
            <p className="text-[10px] font-mono text-ink opacity-50 truncate">@{currentUser.github_username}</p>
          </div>
          <button onClick={onLogout} className="text-ink opacity-60 hover:opacity-100">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

