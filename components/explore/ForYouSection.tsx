'use client';

import type { NearbyPlace } from '@/types';

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '\u{1F374}',
  train_station: '\u{1F686}',
  convenience_store: '\u{1F3EA}',
  pharmacy: '\u{1F48A}',
  cafe: '\u{2615}',
};

interface ForYouSectionProps {
  recommendations: Array<{
    place: NearbyPlace;
    explanation: string;
  }>;
  loading: boolean;
  onPlaceClick?: (place: NearbyPlace) => void;
}

export function ForYouSection({
  recommendations,
  loading,
  onPlaceClick,
}: ForYouSectionProps) {
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-1.5 mb-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L14 8L12 14L10 8L12 2Z"
            fill="#f5c842"
            stroke="#f5c842"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L8 10L14 12L8 14L2 12Z"
            fill="#f5c842"
            stroke="#f5c842"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M19 3L20 6L19 9L18 6L19 3Z"
            fill="#f5c842"
            opacity="0.7"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M5 17L6.5 19L5 21L3.5 19L5 17Z"
            fill="#f5c842"
            opacity="0.7"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="text-[15px] font-bold text-white">For You</h2>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex gap-3 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="foryou-skeleton"
              className="min-w-[200px] max-w-[200px] h-[220px] rounded-[14px] bg-white/10 animate-pulse shrink-0"
            />
          ))}
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && recommendations.length > 0 && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
          {recommendations.map(({ place, explanation }) => {
            const emoji = TYPE_EMOJI[place.type] ?? '\u{1F4CD}';

            return (
              <button
                type="button"
                key={place.id}
                className="min-w-[200px] max-w-[200px] snap-start rounded-[14px] overflow-hidden flex-shrink-0 flex flex-col relative text-left border-0 p-0 cursor-pointer"
                style={{
                  height: 220,
                  boxShadow: '0 2px 20px rgba(245, 200, 66, 0.08), 0 4px 12px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(245, 200, 66, 0.18)',
                }}
                onClick={() => onPlaceClick?.(place)}
              >
                {/* Photo / Fallback */}
                {place.photoUrl ? (
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    data-testid={`foryou-photo-fallback-${place.id}`}
                    className="absolute inset-0 w-full h-full flex items-center justify-center text-[48px]"
                    style={{ backgroundColor: '#1d2c4d' }}
                  >
                    {emoji}
                  </div>
                )}

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)',
                  }}
                />

                {/* Info overlay */}
                <div
                  className="relative mt-auto px-3 py-2.5 z-10"
                  style={{
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(0,0,0,0.25)',
                  }}
                >
                  <h3 className="text-[13px] font-semibold text-white truncate leading-tight">
                    {place.name}
                  </h3>

                  <p className="text-[10px] text-[rgba(245,200,66,0.7)] mt-0.5 truncate leading-snug">
                    {explanation}
                  </p>

                  {place.rating !== null && (
                    <p className="text-[11px] mt-1" style={{ color: '#f5c842' }}>
                      <span>{'\u2605'}</span>{' '}
                      <span>{place.rating}</span>{' '}
                      <span className="text-[rgba(235,235,245,0.4)]">
                        ({place.ratingCount})
                      </span>
                    </p>
                  )}

                  {/* Directions */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${place.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Get directions to ${place.name}`}
                    className="inline-flex items-center gap-1 mt-1 text-[10px] text-[rgba(235,235,245,0.5)] hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    Directions
                  </a>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ForYouSection;
