'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import type { NearbyPlace, PlaceCategory } from '@/types';
import { PlaceCard } from './PlaceCard';

const SEARCH_DEBOUNCE_MS = 400;

/* ------------------------------------------------------------------ */
/*  Category metadata                                                  */
/* ------------------------------------------------------------------ */

const CATEGORY_META: Record<PlaceCategory, { label: string; color: string; emoji: string }> = {
  restaurant: { label: 'Restaurants', color: '#e85d4a', emoji: '\u{1F374}' },
  train_station: { label: 'Stations', color: '#4A90D9', emoji: '\u{1F686}' },
  convenience_store: { label: 'Convenience', color: '#48bb78', emoji: '\u{1F3EA}' },
  pharmacy: { label: 'Pharmacy', color: '#9f7aea', emoji: '\u{1F48A}' },
  cafe: { label: 'Coffee', color: '#c4a882', emoji: '\u{2615}' },
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
  lat: number | null;
  lng: number | null;
  places: NearbyPlace[];
  loading: boolean;
  geoLoading?: boolean;
  geoError?: string | null;
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
  geoLoading,
  geoError,
  onBack,
}: ExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NearbyPlace[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const handleBack = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    onBack();
  }, [onBack]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || lat === null || lng === null) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const url = `/api/places/search?query=${encodeURIComponent(searchQuery.trim())}&lat=${lat}&lng=${lng}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, lat, lng]);

  if (!visible) return null;

  const meta = category ? CATEGORY_META[category] : null;
  const hasLocation = lat !== null && lng !== null;
  const center = hasLocation ? { lat, lng } : { lat: 0, lng: 0 };
  const isSearching = searchQuery.trim().length > 0;
  const displayPlaces = isSearching ? searchResults : (places ?? []);
  const displayLoading = isSearching ? searchLoading : loading;

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
        {meta && !isSearching && (
          <div
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md"
            style={{ backgroundColor: `${meta.color}88` }}
          >
            {meta.emoji} {meta.label}
          </div>
        )}

        {/* Search input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-8 rounded-full bg-black/50 backdrop-blur text-xs text-white placeholder-white/40 border border-white/10 outline-none focus:border-white/30"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {searchQuery && (
            <button
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
              onClick={() => setSearchQuery('')}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ---- Location required state ---- */}
      {!hasLocation && !geoLoading && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
            {'\u{1F4CD}'}
          </div>
          <p className="text-base font-semibold text-white text-center">Location access needed</p>
          <p className="text-sm text-white/50 text-center leading-relaxed">
            {geoError || 'Enable location services to discover places near you.'}
          </p>
        </div>
      )}

      {/* ---- Geolocation loading state ---- */}
      {!hasLocation && geoLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          <p className="text-sm text-white/50">Finding your location...</p>
        </div>
      )}

      {/* ---- Map (top 55%) ---- */}
      {hasLocation && (
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
              <UserLocationDot lat={lat!} lng={lng!} />

              {/* Place markers */}
              {displayPlaces.map((place) => (
                <Marker
                  key={place.id}
                  position={{ lat: place.lat, lng: place.lng }}
                />
              ))}
            </Map>
          </APIProvider>
        </div>
      )}

      {/* ---- Card carousel (bottom 45%) ---- */}
      {hasLocation && (
        <div
          className="flex-1 flex flex-col px-4 pt-4 pb-6"
          style={{ height: '45%' }}
        >
          {/* Header */}
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-white">
              {isSearching ? 'Search Results' : meta?.label ?? 'Nearby'}
            </h2>
            {!displayLoading && displayPlaces.length > 0 && (
              <span className="text-xs text-white/50">
                {displayPlaces.length} {isSearching ? 'found' : 'nearby'}
              </span>
            )}
          </div>

          {/* Loading skeletons */}
          {displayLoading && (
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
          {!displayLoading && displayPlaces.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/40">
                {isSearching ? 'No results found' : 'No places found nearby'}
              </p>
            </div>
          )}

          {/* Place cards */}
          {!displayLoading && displayPlaces.length > 0 && (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
              {displayPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} categoryColor={isSearching ? '#666' : (meta?.color ?? '#666')} />
              ))}
            </div>
          )}
        </div>
      )}

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
