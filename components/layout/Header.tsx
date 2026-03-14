'use client';

import React from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="px-5 py-3 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
      <h1 className="text-xl font-serif tracking-tight text-foreground">
        Found in Translation
      </h1>
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        className="flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
};

export default Header;
