'use client';

import React from 'react';
import { ViewMode } from '@/types';

interface NavButtonProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const NavButton = ({ icon, label, isActive, onClick }: NavButtonProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 group active:scale-95 transition-transform ${
      isActive ? 'text-fluent-primary' : 'text-gray-500'
    }`}
  >
    <div
      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
        isActive ? 'bg-fluent-primary/20 text-fluent-primary' : 'group-hover:bg-fluent-primary/10'
      }`}
    >
      <span
        className={`material-symbols-outlined ${
          isActive ? 'text-fluent-primary' : 'text-gray-500'
        } group-hover:text-fluent-primary`}
      >
        {icon}
      </span>
    </div>
    <span
      className={`text-[9px] font-bold tracking-widest uppercase ${
        isActive ? 'text-fluent-primary' : 'text-gray-600'
      } group-hover:text-fluent-primary`}
    >
      {label}
    </span>
  </button>
);

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex justify-between items-center px-10 pb-6 pt-2 bg-background-dark border-t border-white/5 z-30 relative">
      <NavButton
        icon="chat"
        label="Chat"
        isActive={activeTab === 'chat'}
        onClick={() => onTabChange('chat')}
      />
      <NavButton
        icon="star"
        label="Favs"
        isActive={activeTab === 'favs'}
        onClick={() => onTabChange('favs')}
      />
      {/* Tools Tab (replaces direct AR access) */}
      <NavButton
        icon="travel_explore"
        label="Tools"
        isActive={activeTab === 'tools' || activeTab === 'ar'}
        onClick={() => onTabChange('tools')}
      />
      <NavButton
        icon="settings"
        label="Config"
        isActive={activeTab === 'settings'}
        onClick={() => onTabChange('settings')}
      />
    </div>
  );
};

export default BottomNav;
