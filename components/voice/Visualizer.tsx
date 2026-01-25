'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface VisualizerProps {
  isActive: boolean;
  isLive?: boolean;
  volume?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isActive,
  isLive,
  volume = 0,
}) => {
  if (!isActive && !isLive) return null;

  const bars = [
    { base: 16, multiplier: 40 },
    { base: 24, multiplier: 60 },
    { base: 32, multiplier: 50 },
    { base: 24, multiplier: 60 },
    { base: 16, multiplier: 40 },
  ];

  return (
    <div className="py-6 flex flex-col items-center justify-center">
      <div className="flex items-center gap-1 h-16">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-75',
              isLive ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ height: `${bar.base + volume * bar.multiplier}px` }}
          />
        ))}
      </div>
      {isLive && (
        <span className="mt-3 text-xs text-destructive font-medium animate-pulse-soft">
          Listening...
        </span>
      )}
    </div>
  );
};

export default Visualizer;
