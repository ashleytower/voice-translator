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

// Colors chosen to feel warm, human, and travel-forward — not "AI product"
const orbColors: Record<OrbState, { core: string; glow: string; label: string }> = {
  idle: {
    core: 'radial-gradient(circle at 35% 30%, #f8d5a3, #e8956d 40%, #c96a3a 75%, #9e4a20)',
    glow: 'rgba(210, 120, 60, 0.35)',
    label: 'text-orange-300/70',
  },
  listening: {
    core: 'radial-gradient(circle at 35% 30%, #a8e6cf, #3dbf8a 40%, #1a9668 75%, #0d7050)',
    glow: 'rgba(30, 180, 120, 0.4)',
    label: 'text-emerald-400',
  },
  processing: {
    core: 'radial-gradient(circle at 35% 30%, #fef08a, #f5c842 40%, #d4960a 75%, #a86c00)',
    glow: 'rgba(220, 160, 20, 0.4)',
    label: 'text-amber-300',
  },
  speaking: {
    core: 'radial-gradient(circle at 35% 30%, #bfdbfe, #60a5fa 40%, #2563eb 75%, #1e40af)',
    glow: 'rgba(60, 130, 235, 0.4)',
    label: 'text-blue-300',
  },
  call: {
    core: 'radial-gradient(circle at 35% 30%, #fca5a5, #f87171 40%, #dc2626 75%, #991b1b)',
    glow: 'rgba(220, 50, 50, 0.4)',
    label: 'text-red-400',
  },
};

export const Orb: React.FC<OrbProps> = ({
  state = 'idle',
  volume = 0,
  onClick,
  size = 160,
  className,
}) => {
  const { label, sublabel } = stateConfig[state];
  const colors = orbColors[state];

  const volumeScale = state === 'listening' ? 1 + volume * 0.1 : 1;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Status text above orb */}
      <div className="flex flex-col items-center gap-0.5 h-8">
        <span className={cn('text-xs font-medium tracking-widest uppercase transition-colors duration-300', colors.label)}>
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-muted-foreground/50">{sublabel}</span>
        )}
      </div>

      {/* Orb container */}
      <button
        onClick={onClick}
        className="relative flex items-center justify-center focus:outline-none rounded-full active:scale-95 transition-transform duration-150"
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {/* Glow backdrop */}
        <div
          className={cn(
            'absolute rounded-full transition-all duration-700',
            state === 'idle' && 'orb-glow-idle',
            state === 'listening' && 'orb-glow-listening',
            state === 'processing' && 'orb-glow-processing',
            state === 'speaking' && 'orb-glow-idle',
            state === 'call' && 'orb-glow-call',
          )}
          style={{
            inset: '-30%',
            background: `radial-gradient(circle, ${colors.glow}, transparent 70%)`,
            filter: `blur(${size * 0.25}px)`,
          }}
        />

        {/* Ripple ring 1 */}
        {state !== 'idle' && (
          <div
            className="absolute inset-0 rounded-full orb-ripple-1"
            style={{
              border: `1px solid ${colors.glow.replace('0.4', '0.3').replace('0.35', '0.3')}`,
            }}
          />
        )}

        {/* Ripple ring 2 */}
        {(state === 'listening' || state === 'speaking') && (
          <div
            className="absolute inset-0 rounded-full orb-ripple-2"
            style={{
              border: `1px solid ${colors.glow.replace('0.4', '0.15').replace('0.35', '0.15')}`,
            }}
          />
        )}

        {/* Main orb sphere */}
        <div
          className={cn(
            'relative rounded-full transition-all duration-300',
            state === 'idle' && 'orb-breathe',
            state === 'processing' && 'orb-spin',
          )}
          style={{
            width: size * 0.68,
            height: size * 0.68,
            transform: `scale(${volumeScale})`,
            background: colors.core,
            boxShadow: `0 0 ${size * 0.3}px ${colors.glow}, inset 0 -${size * 0.06}px ${size * 0.12}px rgba(0,0,0,0.25)`,
          }}
        >
          {/* Specular highlight */}
          <div
            className="absolute rounded-full"
            style={{
              top: '10%',
              left: '16%',
              width: '32%',
              height: '28%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent)',
              filter: 'blur(6px)',
            }}
          />
        </div>
      </button>
    </div>
  );
};

export default Orb;
