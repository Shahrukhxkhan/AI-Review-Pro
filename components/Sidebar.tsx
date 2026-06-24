import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings, 
  Database,
  Menu,
  X,
  MessageSquare,
  Sparkles,
  LogOut,
  User as UserIcon,
  Flame
} from 'lucide-react';
import { DBUser, Streak } from '@/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isSupabaseConnected: boolean;
  currentUser: (DBUser & { avatar_url?: string; role?: string }) | null;
  onLogout: () => void;
  streak?: Streak;
}

export default function Sidebar({ currentTab, setCurrentTab, isSupabaseConnected, currentUser, onLogout, streak }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-review', name: 'New Review', icon: PlusCircle },
    { id: 'history', name: 'History', icon: History },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Hamburger Header */}
      <div id="mobile-nav-header" className="md:hidden flex items-center justify-between bg-[#08080a] border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">AI-Review Pro</span>
        </div>
        
        <div className="flex items-center gap-3">
          {streak !== undefined && (
            <div id="sidebar-streak-mobile" className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-500 text-xs font-bold font-mono">
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
              <span>{streak.current_streak}</span>
            </div>
          )}
          <button 
            id="toggle-sidebar"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
            aria-label="Toggle Sidebar"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Side Navigation */}
      <aside 
        id="sidebar" 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#08080a] border-r border-slate-800/80 text-slate-300 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:h-screen shadow-[10px_0_30px_rgba(0,0,0,0.5)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div>
          {/* Header */}
          <div id="sidebar-header" className="p-6 border-b border-slate-800/60 hidden md:flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <MessageSquare className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight text-base">AI-Review Pro</h1>
                <p className="text-slate-500 text-[10px] font-medium tracking-wide uppercase">Workspace Suite</p>
              </div>
            </div>
            {streak !== undefined && (
              <div id="sidebar-streak-desktop" className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-500 text-xs font-bold font-mono shadow-[0_0_10px_rgba(245,158,11,0.1)] shrink-0">
                <Flame className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span>{streak.current_streak}</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav id="sidebar-menu" className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-link-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left
                    ${isActive 
                      ? 'bg-white/5 text-white border border-white/10 shadow-inner' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                >
                  <Icon className={`h-5 w-5 transition-colors 
                    ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} 
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)] animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Status / Environment telemetry module matching standard theme */}
        <div id="sidebar-footer" className="p-4 mt-auto space-y-3">
          
          {/* User Profile Card with Avatar, Username and Sign Out button */}
          {currentUser && (
            <div id="user-profile-sidebar-card" className="bg-[#111114] border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="relative shrink-0">
                  {currentUser.avatar_url ? (
                    <img 
                      src={currentUser.avatar_url} 
                      alt={currentUser.github_username}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full border border-indigo-500/25 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-indigo-500/25 bg-slate-900 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase font-mono">
                      {currentUser.github_username?.substring(0, 2) || 'US'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#111114] rounded-full" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-white text-xs font-bold truncate tracking-tight">
                    {currentUser.github_username}
                  </p>
                  <p className="text-slate-500 text-[9px] font-mono leading-none truncate capitalize mt-0.5">
                    {currentUser.role || 'Member'}
                  </p>
                </div>
              </div>

              <button
                id="sidebar-signout-btn"
                onClick={onLogout}
                className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded-xl border border-transparent hover:border-rose-900/30 transition cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center justify-between">
              <span>Environment</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 opacity-80">Supabase DB</span>
                <span className={`font-semibold ${isSupabaseConnected ? 'text-emerald-400' : 'text-amber-500'}`}>
                  {isSupabaseConnected ? 'Connected' : 'Offline Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 opacity-80">Anthropic Key</span>
                <span className="text-indigo-400 font-semibold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for Mobile backdrop */}
      {isOpen && (
        <div 
          id="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
        />
      )}
    </>
  );
}
