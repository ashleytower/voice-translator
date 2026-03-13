'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { MessageSquare, Star, Repeat, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const NavButton = ({ icon, label, isActive, onClick }: NavButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      'relative flex flex-col items-center gap-1 px-3 py-2 transition-colors',
      isActive
        ? 'text-primary'
        : 'text-muted-foreground hover:text-foreground'
    )}
  >
    {isActive && (
      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
    )}
    <div className="flex items-center justify-center">
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="flex justify-around items-center px-4 py-2 border-t border-border bg-background">
      <NavButton
        icon={<MessageSquare className="h-[18px] w-[18px]" />}
        label="Chat"
        isActive={activeTab === 'chat'}
        onClick={() => onTabChange('chat')}
      />
      <NavButton
        icon={<Star className="h-[18px] w-[18px]" />}
        label="Saved"
        isActive={activeTab === 'favs'}
        onClick={() => onTabChange('favs')}
      />
      <NavButton
        icon={<Repeat className="h-[18px] w-[18px]" />}
        label="Convert"
        isActive={activeTab === 'currency'}
        onClick={() => onTabChange('currency')}
      />
      <NavButton
        icon={<Settings className="h-[18px] w-[18px]" />}
        label="Settings"
        isActive={activeTab === 'settings'}
        onClick={() => onTabChange('settings')}
      />
    </nav>
  );
};

export default BottomNav;
