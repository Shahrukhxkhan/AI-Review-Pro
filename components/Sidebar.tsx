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
import { DBUser, Streak } from '@/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isSupabaseConnected: boolean;
  currentUser: (DBUser & { avatar_url?: string; role?: string }) | null;
  onLogout: () => void;
  streak?: Streak;
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
    <div className="fixed top-0 left-0 h-screen w-[200px] bg-[#1e2735] flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-[#2d3a4d]">
        <h1 className="text-[13px] font-medium text-[#e8edf3]">AI-Review Pro</h1>
        <p className="text-[10px] uppercase text-[#5a6a80] mt-0.5">Code intelligence</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-6 space-y-8">
        <div>
          <h2 className="text-[10px] uppercase text-[#5a6a80] mb-3 px-2">Main</h2>
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-[12px] font-medium transition ${
                    isActive ? 'bg-[#1D9E75] text-[#ffffff]' : 'text-[#7a8fa8] hover:text-[#ffffff] hover:bg-[#2d3a4d]'
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] uppercase text-[#5a6a80] mb-3 px-2">Analytics</h2>
          <div className="space-y-1">
            {analyticsNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-[12px] font-medium transition ${
                    isActive ? 'bg-[#1D9E75] text-[#ffffff]' : 'text-[#7a8fa8] hover:text-[#ffffff] hover:bg-[#2d3a4d]'
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      {currentUser && (
        <div className="p-4 border-t border-[#2d3a4d]">
          <div className="flex items-center gap-3">
            <div className="w-[26px] h-[26px] rounded-full bg-[#1D9E75] flex items-center justify-center text-[9px] font-medium text-white">
              {currentUser.github_username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-medium text-[#c8d4e0] truncate">Shahrukh</p>
              <p className="text-[10px] text-[#5a6a80] truncate">@{currentUser.github_username}</p>
            </div>
            <button onClick={onLogout} className="text-[#7a8fa8] hover:text-white">
              <LogOut className="w-[15px] h-[15px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

