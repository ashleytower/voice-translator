'use client';

import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  isLive?: boolean;
  volume?: number; // 0 to 1
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isActive,
  isLive,
  volume = 0,
}) => {
  if (!isActive && !isLive) return <div className="h-32"></div>;

  // Scale effects based on volume
  // Base scale is 1, max scale adds 0.5 based on volume
  const scale = 1 + Math.max(0, volume * 1.5);
  const ringScale = 1 + Math.max(0, volume * 0.5);

  return (
    <div className="py-8 flex flex-col items-center justify-center fade-in duration-500">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Outer Rings - Dynamic Scale */}
        <div
          className={`absolute inset-0 rounded-full border transition-transform duration-75 ${
            isLive ? 'border-red-500/30' : 'border-fluent-primary/20'
          }`}
          style={{ transform: `scale(${ringScale * 1.2})` }}
        ></div>
        <div
          className={`absolute inset-4 rounded-full border transition-transform duration-100 ${
            isLive ? 'border-red-500/20' : 'border-fluent-secondary/30'
          }`}
          style={{ transform: `scale(${ringScale * 1.1})` }}
        ></div>

        {/* Core Orb - Dynamic Scale */}
        <div
          className={`relative w-28 h-28 rounded-full border border-white/20 orb-glow flex items-center justify-center overflow-hidden transition-all duration-75 ease-out ${
            isLive
              ? 'bg-gradient-to-tr from-background-dark to-red-900/40'
              : 'bg-gradient-to-tr from-background-dark to-surface-dark'
          }`}
          style={{ transform: `scale(${scale})` }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-t via-transparent transition-colors duration-500 ${
              isLive
                ? 'from-red-500/20 to-red-500/10'
                : 'from-fluent-primary/20 to-fluent-secondary/20'
            }`}
          ></div>

          {/* Audio Bars - Simple Animation + Volume modification */}
          <div className="flex gap-1 items-center z-10 h-16 items-center justify-center">
            {/* We use inline styles for height to react to volume immediately without CSS animation lag */}
            <div
              className={`w-1 rounded-full transition-all duration-75 ${
                isLive ? 'bg-red-400' : 'bg-fluent-primary'
              }`}
              style={{ height: `${10 + volume * 40}px` }}
            ></div>
            <div
              className="w-1 bg-white rounded-full transition-all duration-75"
              style={{ height: `${16 + volume * 60}px` }}
            ></div>
            <div
              className={`w-1 rounded-full transition-all duration-75 ${
                isLive ? 'bg-red-500' : 'bg-fluent-secondary'
              }`}
              style={{ height: `${8 + volume * 30}px` }}
            ></div>
            <div
              className={`w-1 rounded-full transition-all duration-75 ${
                isLive ? 'bg-red-400' : 'bg-fluent-primary'
              }`}
              style={{ height: `${14 + volume * 50}px` }}
            ></div>
            <div
              className="w-1 bg-white rounded-full transition-all duration-75"
              style={{ height: `${12 + volume * 40}px` }}
            ></div>
          </div>
        </div>
      </div>
      {isLive && (
        <span className="absolute mt-44 text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold animate-pulse">
          Live Audio
        </span>
      )}
    </div>
  );
};

export default Visualizer;
