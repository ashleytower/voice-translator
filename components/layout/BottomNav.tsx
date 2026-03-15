'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { Mic, ScanLine, ArrowLeftRight, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrbState } from '@/components/voice/Orb';

interface NavTab {
  viewMode: ViewMode;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const LEFT_TABS: NavTab[] = [
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
];

const RIGHT_TABS: NavTab[] = [
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

const ORB_SIZES: Record<string, number> = {
  idle: 42,
  listening: 62,
  speaking: 54,
  processing: 42,
  call: 42,
};

const ORB_COLORS: Record<OrbState, { core: string; glow: string }> = {
  idle: {
    core: 'radial-gradient(circle at 35% 30%, #f8d5a3, #e8956d 40%, #c96a3a 75%, #9e4a20)',
    glow: 'rgba(210, 120, 60, 0.35)',
  },
  listening: {
    core: 'radial-gradient(circle at 35% 30%, #a8e6cf, #3dbf8a 40%, #1a9668 75%, #0d7050)',
    glow: 'rgba(30, 180, 120, 0.4)',
  },
  processing: {
    core: 'radial-gradient(circle at 35% 30%, #fef08a, #f5c842 40%, #d4960a 75%, #a86c00)',
    glow: 'rgba(220, 160, 20, 0.4)',
  },
  speaking: {
    core: 'radial-gradient(circle at 35% 30%, #bfdbfe, #60a5fa 40%, #2563eb 75%, #1e40af)',
    glow: 'rgba(60, 130, 235, 0.4)',
  },
  call: {
    core: 'radial-gradient(circle at 35% 30%, #fca5a5, #f87171 40%, #dc2626 75%, #991b1b)',
    glow: 'rgba(220, 50, 50, 0.4)',
  },
};

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
  orbState?: OrbState;
  micVolume?: number;
  onOrbClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  orbState = 'idle',
  micVolume = 0,
  onOrbClick,
}) => {
  if (activeTab === 'camera') return null;

  const orbSize = ORB_SIZES[orbState] ?? 42;
  const colors = ORB_COLORS[orbState];
  const volumeScale = orbState === 'listening' ? 1 + micVolume * 0.08 : 1;

  const renderTab = (tab: NavTab) => {
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
  };

  return (
    <nav
      className="border-t border-white/[0.08] bg-[#1C1C1E]/90 backdrop-blur-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around h-[49px]">
        {LEFT_TABS.map(renderTab)}

        {/* Center orb */}
        <div className="flex items-center justify-center flex-1 h-full">
          <button
            onClick={onOrbClick}
            className="relative flex items-center justify-center focus:outline-none active:scale-95 transition-transform duration-150"
            aria-label="Voice orb"
          >
            {/* Glow */}
            {orbState !== 'idle' && (
              <div
                className="absolute rounded-full"
                style={{
                  inset: '-40%',
                  background: `radial-gradient(circle, ${colors.glow}, transparent 70%)`,
                  filter: 'blur(12px)',
                }}
              />
            )}
            {/* Ripple ring */}
            {orbState === 'listening' && (
              <div
                className="absolute rounded-full orb-ripple-1"
                style={{
                  width: orbSize + 16,
                  height: orbSize + 16,
                  border: `1px solid ${colors.glow.replace('0.4', '0.3').replace('0.35', '0.3')}`,
                }}
              />
            )}
            {/* Sphere */}
            <div
              className={cn(
                'rounded-full transition-all duration-300',
                orbState === 'idle' && 'orb-breathe',
                orbState === 'processing' && 'orb-spin',
              )}
              style={{
                width: orbSize,
                height: orbSize,
                transform: `scale(${volumeScale})`,
                background: colors.core,
                boxShadow: `0 0 ${orbSize * 0.4}px ${colors.glow}, inset 0 -${orbSize * 0.06}px ${orbSize * 0.12}px rgba(0,0,0,0.25)`,
                transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease',
              }}
            >
              {/* Specular highlight */}
              <div
                className="absolute rounded-full"
                style={{
                  top: '10%',
                  left: '16%',
                  width: '32%',
                  height: '28%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent)',
                  filter: 'blur(4px)',
                }}
              />
            </div>
          </button>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
};

export default BottomNav;
