'use client';

import type { NearbyPlace } from '@/types';

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍴',
  train_station: '🚆',
  convenience_store: '🏪',
  pharmacy: '💊',
  atm: '💵',
};

interface PlaceCardProps {
  place: NearbyPlace;
  categoryColor: string;
}

export function PlaceCard({ place, categoryColor }: PlaceCardProps) {
  const emoji = TYPE_EMOJI[place.type] ?? '📍';

  return (
    <div className="min-w-[200px] max-w-[200px] snap-start rounded-[14px] overflow-hidden bg-[#222] flex-shrink-0 flex flex-col">
      {/* Photo / Fallback */}
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt={place.name}
          className="h-[100px] w-full object-cover"
        />
      ) : (
        <div
          data-testid="photo-fallback"
          className="h-[100px] w-full flex items-center justify-center text-[40px]"
          style={{ backgroundColor: categoryColor }}
        >
          {emoji}
        </div>
      )}

      {/* Info */}
      <div className="px-3 py-2.5">
        <h3 className="text-[13px] font-semibold text-white truncate">
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

        <div className="flex items-center gap-2 mt-1.5">
          {place.isOpen === true && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-600/30 text-green-400">
              Open
            </span>
          )}
          {place.isOpen === false && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-600/30 text-red-400">
              Closed
            </span>
          )}

          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              aria-label="Call"
              className="text-[10px] text-[rgba(235,235,245,0.5)] hover:text-white flex items-center gap-0.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {place.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlaceCard;
