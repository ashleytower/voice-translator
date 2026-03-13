'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { MessageSquare, Star, ArrowLeftRight, Settings } from 'lucide-react';
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
      'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
      isActive
        ? 'text-primary'
        : 'text-muted-foreground hover:text-foreground'
    )}
  >
    <div className={cn(
      'flex items-center justify-center w-10 h-7 rounded-full transition-colors duration-200',
      isActive && 'bg-primary/15'
    )}>
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
    <nav className="flex justify-around items-center px-2 py-1.5 bg-background/80 backdrop-blur-xl border-t border-border/50">
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
        icon={<ArrowLeftRight className="h-[18px] w-[18px]" />}
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
