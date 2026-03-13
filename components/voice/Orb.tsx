'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'call';

interface OrbProps {
  state: OrbState;
  volume?: number; // 0-1, for mic volume reactivity
  onClick?: () => void;
  size?: number;
  className?: string;
}

const stateConfig: Record<OrbState, { label: string; sublabel?: string }> = {
  idle: { label: 'Tap to speak' },
  listening: { label: 'Listening...', sublabel: 'Speak now' },
  processing: { label: 'Translating...' },
  speaking: { label: 'Playing...' },
  call: { label: 'On call', sublabel: 'Tap to end' },
};

export const Orb: React.FC<OrbProps> = ({
  state = 'idle',
  volume = 0,
  onClick,
  size = 200,
  className,
}) => {
  const { label, sublabel } = stateConfig[state];

  // Scale the orb slightly based on mic volume
  const volumeScale = state === 'listening' ? 1 + volume * 0.12 : 1;
  // Ripple opacity based on volume
  const rippleIntensity = state === 'listening' ? 0.15 + volume * 0.4 : 0;

  return (
    <div className={cn('flex flex-col items-center gap-5', className)}>
      {/* Orb container */}
      <button
        onClick={onClick}
        className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-full"
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {/* Outer ripple rings */}
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            state === 'listening' && 'orb-ripple-1',
            state === 'speaking' && 'orb-ripple-speak',
            state === 'call' && 'orb-ripple-call',
          )}
          style={{
            background: 'transparent',
            border: state === 'idle' ? 'none' : '1px solid',
            borderColor:
              state === 'listening'
                ? `rgba(99, 102, 241, ${rippleIntensity})`
                : state === 'speaking'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : state === 'call'
                    ? 'rgba(251, 146, 60, 0.2)'
                    : 'transparent',
            transform: `scale(${state === 'idle' ? 1 : 1.4})`,
          }}
        />
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            state === 'listening' && 'orb-ripple-2',
            state === 'speaking' && 'orb-ripple-speak-2',
          )}
          style={{
            background: 'transparent',
            border: state !== 'idle' && state !== 'call' ? '1px solid' : 'none',
            borderColor:
              state === 'listening'
                ? `rgba(139, 92, 246, ${rippleIntensity * 0.6})`
                : state === 'speaking'
                  ? 'rgba(56, 189, 248, 0.1)'
                  : 'transparent',
            transform: `scale(${state === 'idle' ? 1 : 1.7})`,
          }}
        />

        {/* Glow layer */}
        <div
          className={cn(
            'absolute rounded-full transition-all duration-700',
            state === 'idle' && 'orb-glow-idle',
            state === 'listening' && 'orb-glow-listening',
            state === 'processing' && 'orb-glow-processing',
            state === 'speaking' && 'orb-glow-speaking',
            state === 'call' && 'orb-glow-call',
          )}
          style={{
            inset: '-20%',
            filter: `blur(${size * 0.3}px)`,
            opacity: state === 'idle' ? 0.3 : 0.5,
          }}
        />

        {/* Main orb body */}
        <div
          className={cn(
            'relative rounded-full transition-transform duration-300 ease-out',
            state === 'idle' && 'orb-breathe',
            state === 'processing' && 'orb-spin',
          )}
          style={{
            width: size * 0.65,
            height: size * 0.65,
            transform: `scale(${volumeScale})`,
            background:
              state === 'idle'
                ? 'radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #4f46e5 70%, #3730a3)'
                : state === 'listening'
                  ? 'radial-gradient(circle at 35% 35%, #a78bfa, #7c3aed 40%, #6d28d9 70%, #5b21b6)'
                  : state === 'processing'
                    ? 'radial-gradient(circle at 35% 35%, #fbbf24, #f59e0b 40%, #d97706 70%, #b45309)'
                    : state === 'speaking'
                      ? 'radial-gradient(circle at 35% 35%, #67e8f9, #22d3ee 40%, #06b6d4 70%, #0891b2)'
                      : 'radial-gradient(circle at 35% 35%, #fdba74, #fb923c 40%, #f97316 70%, #ea580c)',
            boxShadow:
              state === 'idle'
                ? '0 0 40px rgba(99, 102, 241, 0.3), inset 0 -8px 20px rgba(0,0,0,0.2)'
                : state === 'listening'
                  ? '0 0 60px rgba(139, 92, 246, 0.4), inset 0 -8px 20px rgba(0,0,0,0.2)'
                  : state === 'processing'
                    ? '0 0 50px rgba(245, 158, 11, 0.4), inset 0 -8px 20px rgba(0,0,0,0.2)'
                    : state === 'speaking'
                      ? '0 0 50px rgba(34, 211, 238, 0.4), inset 0 -8px 20px rgba(0,0,0,0.2)'
                      : '0 0 50px rgba(251, 146, 60, 0.4), inset 0 -8px 20px rgba(0,0,0,0.2)',
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute rounded-full"
            style={{
              top: '12%',
              left: '18%',
              width: '35%',
              height: '35%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      </button>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            'text-sm font-medium tracking-wide transition-colors duration-300',
            state === 'idle' && 'text-muted-foreground',
            state === 'listening' && 'text-violet-400',
            state === 'processing' && 'text-amber-400',
            state === 'speaking' && 'text-cyan-400',
            state === 'call' && 'text-orange-400',
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-xs text-muted-foreground/60">{sublabel}</span>
        )}
      </div>
    </div>
  );
};

export default Orb;
