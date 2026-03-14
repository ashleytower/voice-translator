'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { Mic, ScanLine, ArrowLeftRight, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavTab {
  viewMode: ViewMode;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const TABS: NavTab[] = [
  {
    viewMode: 'translate',
    label: 'Translate',
    icon: <Mic className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <Mic className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'camera',
    label: 'Scan',
    icon: <ScanLine className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <ScanLine className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'convert',
    label: 'Convert',
    icon: <ArrowLeftRight className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <ArrowLeftRight className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'phrases',
    label: 'Phrases',
    icon: <BookmarkCheck className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <BookmarkCheck className="h-6 w-6" strokeWidth={2} />,
  },
];

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  if (activeTab === 'camera') return null;

  return (
    <nav className="h-16 pb-safe flex items-center justify-around bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/[0.06]">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.viewMode;
        return (
          <button
            key={tab.viewMode}
            onClick={() => onTabChange(tab.viewMode)}
            className={cn(
              'flex flex-col items-center gap-1 min-w-16 min-h-12 px-3 py-2 transition-colors',
              isActive ? 'text-[#64B5F6]' : 'text-[rgba(235,235,245,0.6)] active:text-white'
            )}
          >
            <div className="relative flex items-center justify-center">
              {isActive && (
                <div className="tab-pill absolute w-16 h-8 rounded-2xl bg-[rgba(100,181,246,0.12)]" />
              )}
              <span className="relative z-10">{isActive ? tab.activeIcon : tab.icon}</span>
            </div>
            <span className={cn(
              'text-[11px] tracking-wide',
              isActive ? 'font-semibold' : 'font-medium'
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
