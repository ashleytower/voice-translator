'use client';

import type { NearbyPlace } from '@/types';

interface FamiliarSpotsBannerProps {
  matches: Array<{
    savedPlaceName: string;
    savedCity: string;
    nearbyPlace: NearbyPlace;
  }>;
  onTap?: (place: NearbyPlace) => void;
}

export function FamiliarSpotsBanner({ matches, onTap }: FamiliarSpotsBannerProps) {
  if (matches.length === 0) {
    return null;
  }

  const firstMatch = matches[0];
  const remainingCount = matches.length - 1;

  return (
    <button
      type="button"
      data-testid="familiar-spots-banner"
      className="w-full mb-3 px-4 py-3 rounded-xl text-left border-0 cursor-pointer"
      style={{
        background: 'rgba(245, 200, 66, 0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(245, 200, 66, 0.2)',
      }}
      onClick={() => onTap?.(firstMatch.nearbyPlace)}
    >
      <div className="flex items-center gap-2">
        {/* Pin icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245, 200, 66, 0.15)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f5c842"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">
            {firstMatch.nearbyPlace.name} is nearby
          </p>
          <p className="text-[11px] text-[rgba(235,235,245,0.5)] mt-0.5 truncate">
            You saved this in {firstMatch.savedCity}
          </p>
        </div>

        {/* Arrow */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="rgba(235,235,245,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </div>

      {remainingCount > 0 && (
        <p className="text-[10px] text-[rgba(245,200,66,0.6)] mt-1.5 pl-10">
          +{remainingCount} more familiar spots
        </p>
      )}
    </button>
  );
}

export default FamiliarSpotsBanner;
