'use client';

import { useState, useCallback } from 'react';
import type { PlaceCategory } from '@/types';

interface FabSpeedDialProps {
  onCategorySelect: (category: PlaceCategory) => void;
  visible: boolean;
}

const CATEGORIES: Array<{
  category: PlaceCategory;
  label: string;
  emoji: string;
  color: string;
}> = [
  { category: 'restaurant', label: 'Restaurants', emoji: '\u{1F374}', color: '#e85d4a' },
  { category: 'train_station', label: 'Stations', emoji: '\u{1F686}', color: '#4A90D9' },
  { category: 'convenience_store', label: 'Konbini', emoji: '\u{1F3EA}', color: '#48bb78' },
  { category: 'pharmacy', label: 'Pharmacy', emoji: '\u{1F48A}', color: '#9f7aea' },
  { category: 'atm', label: 'ATMs', emoji: '\u{1F4B5}', color: '#ecc94b' },
];

export function FabSpeedDial({ onCategorySelect, visible }: FabSpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleBackdropClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCategoryClick = useCallback(
    (category: PlaceCategory) => {
      onCategorySelect(category);
      setIsOpen(false);
    },
    [onCategorySelect],
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          data-testid="fab-backdrop"
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={handleBackdropClick}
        />
      )}

      {/* FAB container */}
      <div className="fixed z-50" style={{ bottom: 90, right: 16 }}>
        {/* Category items */}
        {isOpen && (
          <div className="flex flex-col-reverse items-end gap-3 mb-3">
            {CATEGORIES.map((item, index) => (
              <button
                key={item.category}
                className="flex items-center gap-2 group"
                onClick={() => handleCategoryClick(item.category)}
                style={{
                  animation: `fabItemIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 50}ms both`,
                }}
              >
                {/* Text label */}
                <span className="text-sm font-medium text-white bg-black/70 px-3 py-1.5 rounded-full whitespace-nowrap backdrop-blur-sm">
                  {item.label}
                </span>

                {/* Colored circle */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  {item.emoji}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB trigger */}
        <button
          aria-label="Explore nearby places"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #f8d5a3, #e8956d 40%, #c96a3a 75%, #9e4a20)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 24px rgba(210,120,60,0.3)',
            transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          onClick={handleToggle}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M16.24 7.76l-1.804 5.411-5.412 1.804 1.804-5.411z" />
          </svg>
        </button>
      </div>

      {/* Keyframe animation for staggered entrance */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fabItemIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      ` }} />
    </>
  );
}
