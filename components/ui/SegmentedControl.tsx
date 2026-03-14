'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedControlProps {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function SegmentedControl({ segments, activeIndex, onChange, className }: SegmentedControlProps) {
  const width = `calc(${100 / segments.length}% - 2px)`;

  return (
    <div className={cn('relative flex bg-white/[0.06] rounded-[18px] p-0.5 h-9', className)}>
      <div
        className="absolute top-0.5 bottom-0.5 rounded-2xl bg-[#64B5F6] shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          width,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 2}px))`,
        }}
      />
      {segments.map((label, i) => (
        <button
          key={label}
          onClick={() => onChange(i)}
          className={cn(
            'flex-1 relative z-10 flex items-center justify-center text-[13px] transition-colors duration-200',
            i === activeIndex
              ? 'text-black font-semibold'
              : 'text-[rgba(235,235,245,0.6)] font-medium'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
