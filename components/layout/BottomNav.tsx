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
    icon: <Mic className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <Mic className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'camera',
    label: 'Scan',
    icon: <ScanLine className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <ScanLine className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'convert',
    label: 'Convert',
    icon: <ArrowLeftRight className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <ArrowLeftRight className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'phrases',
    label: 'Phrases',
    icon: <BookmarkCheck className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <BookmarkCheck className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
];

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  if (activeTab === 'camera') return null;

  return (
    <nav
      className="border-t border-white/[0.08] bg-[#1C1C1E]/90 backdrop-blur-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around h-[49px]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.viewMode;
          return (
            <button
              key={tab.viewMode}
              onClick={() => onTabChange(tab.viewMode)}
              className={cn(
                'flex flex-col items-center justify-center gap-[2px] flex-1 h-full pt-1.5 pb-1 transition-colors',
                isActive
                  ? 'text-[#64B5F6]'
                  : 'text-[rgba(235,235,245,0.4)] active:text-[rgba(235,235,245,0.7)]'
              )}
            >
              <span>{isActive ? tab.activeIcon : tab.icon}</span>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
