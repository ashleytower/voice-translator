import React from 'react';
import { cn } from '@/lib/utils';

export type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface VoiceOrbProps {
  state: VoiceOrbState;
  className?: string;
}

export function VoiceOrb({ state, className }: VoiceOrbProps) {
  const stateStyles = {
    idle: 'bg-gray-400/20 border-gray-400',
    connecting: 'bg-yellow-400/20 border-yellow-400',
    listening: 'bg-blue-400/20 border-blue-400',
    speaking: 'bg-green-400/20 border-green-400',
  };

  const shouldPulse = state === 'listening' || state === 'speaking' || state === 'connecting';

  return (
    <div
      data-testid="voice-orb"
      className={cn(
        'relative w-32 h-32 rounded-full border-4 transition-all duration-300',
        'backdrop-blur-md shadow-lg',
        `state-${state}`,
        stateStyles[state],
        shouldPulse && 'animate-pulse',
        className
      )}
    >
      {/* Inner glow effect */}
      <div
        className={cn(
          'absolute inset-2 rounded-full blur-sm',
          state === 'idle' && 'bg-gray-400/10',
          state === 'connecting' && 'bg-yellow-400/30',
          state === 'listening' && 'bg-blue-400/30',
          state === 'speaking' && 'bg-green-400/30'
        )}
      />
    </div>
  );
}
