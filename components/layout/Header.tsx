'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Settings } from 'lucide-react';

interface HeaderProps {
  onClearHistory?: () => void;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onClearHistory, onSettingsClick }) => {
  return (
    <header className="px-4 py-3 flex items-center justify-between border-b border-border sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-foreground text-sm">
            translate
          </span>
        </div>
        <div>
          <h1 className="text-sm font-semibold">Fluent</h1>
          <span className="text-xs text-muted-foreground">Voice Translator</span>
        </div>
      </div>
      <div className="flex gap-1">
        {onClearHistory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearHistory}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-8 w-8 text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
