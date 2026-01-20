'use client';

import React from 'react';

interface HeaderProps {
  onClearHistory?: () => void;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onClearHistory, onSettingsClick }) => {
  return (
    <header className="pt-10 pb-4 px-6 flex items-center justify-between bg-background-dark/40 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fluent-primary to-fluent-secondary flex items-center justify-center shadow-lg shadow-fluent-primary/20">
          <span className="material-symbols-outlined text-background-dark font-bold">
            bolt
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight leading-none">FLUENT</h1>
          <span className="text-[10px] text-fluent-primary font-medium tracking-widest uppercase opacity-80">
            Online & Listening
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95 group"
            title="Clear Chat History"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
        <button className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
