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
      'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
      isActive
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    )}
  >
    <div className={cn(
      'p-2 rounded-lg transition-colors',
      isActive && 'bg-secondary'
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
    <nav className="flex justify-around items-center px-4 py-2 border-t border-border bg-background">
      <NavButton
        icon={<MessageSquare className="h-5 w-5" />}
        label="Chat"
        isActive={activeTab === 'chat'}
        onClick={() => onTabChange('chat')}
      />
      <NavButton
        icon={<Star className="h-5 w-5" />}
        label="Saved"
        isActive={activeTab === 'favs'}
        onClick={() => onTabChange('favs')}
      />
      <NavButton
        icon={<Repeat className="h-5 w-5" />}
        label="Convert"
        isActive={activeTab === 'currency'}
        onClick={() => onTabChange('currency')}
      />
      <NavButton
        icon={<Settings className="h-5 w-5" />}
        label="Settings"
        isActive={activeTab === 'settings'}
        onClick={() => onTabChange('settings')}
      />
    </nav>
  );
};

export default BottomNav;
