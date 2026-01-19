import React from 'react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  children?: React.ReactNode;
  className?: string;
}

export function ChatPanel({ children, className }: ChatPanelProps) {
  return (
    <div
      data-testid="chat-panel"
      className={cn(
        'relative rounded-2xl border border-white/20',
        'bg-white/10 backdrop-blur-md',
        'shadow-xl',
        'overflow-y-auto',
        'p-6',
        'transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}
