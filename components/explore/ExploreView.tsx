'use client';

import { useCallback } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import type { NearbyPlace, PlaceCategory } from '@/types';
import { PlaceCard } from './PlaceCard';

/* ------------------------------------------------------------------ */
/*  Category metadata                                                  */
/* ------------------------------------------------------------------ */

const CATEGORY_META: Record<PlaceCategory, { label: string; color: string; emoji: string }> = {
  restaurant: { label: 'Restaurants', color: '#e85d4a', emoji: '\u{1F374}' },
  train_station: { label: 'Stations', color: '#4A90D9', emoji: '\u{1F686}' },
  convenience_store: { label: 'Convenience', color: '#48bb78', emoji: '\u{1F3EA}' },
  pharmacy: { label: 'Pharmacy', color: '#9f7aea', emoji: '\u{1F48A}' },
  atm: { label: 'ATMs', color: '#ecc94b', emoji: '\u{1F4B5}' },
};

/* ------------------------------------------------------------------ */
/*  Dark map styles (inline, no mapId needed)                          */
/* ------------------------------------------------------------------ */

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ExploreViewProps {
  visible: boolean;
  category: PlaceCategory | null;
  lat: number;
  lng: number;
  places: NearbyPlace[];
  loading: boolean;
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ExploreView({
  visible,
  category,
  lat,
  lng,
  places,
  loading,
  onBack,
}: ExploreViewProps) {
  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  if (!visible) return null;

  const meta = category ? CATEGORY_META[category] : null;
  const center = { lat, lng };
  const safePlaces = places ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0e1626]"
      style={{
        animation: 'exploreSlideUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      {/* ---- Top controls ---- */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
        {/* Back button */}
        <button
          aria-label="Back"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-black/50 backdrop-blur"
          onClick={handleBack}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>

        {/* Category pill */}
        {meta && (
          <div
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md"
            style={{ backgroundColor: `${meta.color}88` }}
          >
            {meta.emoji} {meta.label}
          </div>
        )}
      </div>

      {/* ---- Map (top 55%) ---- */}
      <div className="relative" style={{ height: '55%' }}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
          <Map
            defaultCenter={center}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI
            styles={DARK_MAP_STYLES}
          >
            {/* User location blue dot */}
            <UserLocationDot lat={lat} lng={lng} />

            {/* Place markers */}
            {safePlaces.map((place) => (
              <Marker
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
              />
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* ---- Card carousel (bottom 45%) ---- */}
      <div
        className="flex-1 flex flex-col px-4 pt-4 pb-6"
        style={{ height: '45%' }}
      >
        {/* Header */}
        {meta && (
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-white">{meta.label}</h2>
            {!loading && safePlaces.length > 0 && (
              <span className="text-xs text-white/50">
                {safePlaces.length} nearby
              </span>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="flex gap-3 overflow-x-auto">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                data-testid="skeleton-card"
                className="min-w-[260px] h-36 rounded-2xl bg-white/10 animate-pulse shrink-0"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && safePlaces.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-white/40">No places found nearby</p>
          </div>
        )}

        {/* Place cards */}
        {!loading && safePlaces.length > 0 && (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {safePlaces.map((place) => (
              <PlaceCard key={place.id} place={place} categoryColor={meta?.color ?? '#666'} />
            ))}
          </div>
        )}
      </div>

      {/* Slide-up keyframe */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes exploreSlideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  User location blue dot overlay                                     */
/* ------------------------------------------------------------------ */

function UserLocationDot({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div
      data-testid="user-location-dot"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      {/* Pulsing ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          width: 32,
          height: 32,
          marginLeft: -9,
          marginTop: -9,
          backgroundColor: 'rgba(74, 144, 217, 0.25)',
          animation: 'userDotPulse 2s ease-out infinite',
        }}
      />
      {/* Solid dot */}
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#4A90D9',
          border: '2.5px solid white',
          boxShadow: '0 0 6px rgba(74, 144, 217, 0.6)',
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes userDotPulse {
              0% { transform: scale(1); opacity: 0.7; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          `,
        }}
      />
    </div>
  );
}
