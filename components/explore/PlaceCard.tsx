'use client';

import type { NearbyPlace } from '@/types';

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍴',
  train_station: '🚆',
  convenience_store: '🏪',
  pharmacy: '💊',
  cafe: '☕',
};

interface PlaceCardProps {
  place: NearbyPlace;
  categoryColor: string;
}

export function PlaceCard({ place, categoryColor }: PlaceCardProps) {
  const emoji = TYPE_EMOJI[place.type] ?? '📍';

  return (
    <div
      className="min-w-[200px] max-w-[200px] snap-start rounded-[14px] overflow-hidden flex-shrink-0 flex flex-col relative"
      style={{
        height: 220,
        boxShadow: `0 2px 20px ${categoryColor}22, 0 4px 12px rgba(0,0,0,0.4)`,
        border: `1px solid ${categoryColor}30`,
      }}
    >
      {/* Photo / Fallback -- full bleed background */}
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt={place.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          data-testid="photo-fallback"
          className="absolute inset-0 w-full h-full flex items-center justify-center text-[48px]"
          style={{ backgroundColor: categoryColor }}
        >
          {emoji}
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Open/Closed badge -- top right */}
      {place.isOpen !== null && (
        <div className="absolute top-2 right-2 z-10">
          {place.isOpen === true && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/90 text-white shadow-sm">
              Open
            </span>
          )}
          {place.isOpen === false && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/80 text-white shadow-sm">
              Closed
            </span>
          )}
        </div>
      )}

      {/* Info overlay -- bottom, glass morphism */}
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

        <p className="text-[11px] text-[rgba(235,235,245,0.6)] mt-0.5 truncate">
          {place.address}{place.priceLevel ? ` · ${place.priceLevel}` : ''}
        </p>

        {place.rating !== null && (
          <p className="text-[11px] mt-1" style={{ color: '#f5c842' }}>
            <span>★</span>{' '}
            <span>{place.rating}</span>{' '}
            <span className="text-[rgba(235,235,245,0.4)]">({place.ratingCount})</span>
          </p>
        )}

        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            aria-label="Call"
            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[rgba(235,235,245,0.6)] hover:text-white transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            {place.phone}
          </a>
        )}
      </div>
    </div>
  );
}

export default PlaceCard;
