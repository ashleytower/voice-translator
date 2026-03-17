'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import type { NearbyPlace, PlaceCategory } from '@/types';
import { PlaceCard } from './PlaceCard';
import { ForYouSection } from './ForYouSection';
import { FamiliarSpotsBanner } from './FamiliarSpotsBanner';
import { MemoryTimeline } from '../memory/MemoryTimeline';
import { PaywallSheet } from '../subscription/PaywallSheet';

type ExploreSubView = 'nearby' | 'foryou' | 'memory';

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

const SAVED_MARKER_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="#f5c842" stroke="#c9a000" stroke-width="1.5"/><circle cx="14" cy="14" r="5" fill="white"/></svg>');

interface ExploreViewProps {
  visible: boolean;
  category: PlaceCategory | null;
  lat: number | null;
  lng: number | null;
  places: NearbyPlace[];
  loading: boolean;
  geoLoading?: boolean;
  geoError?: string | null;
  savedPlaces?: NearbyPlace[];
  isSaved?: (placeId: string) => boolean;
  onToggleSave?: (place: NearbyPlace) => void;
  onBack: () => void;
  recommendations?: Array<{ place: NearbyPlace; explanation: string }>;
  chainMatches?: Array<{ savedPlaceName: string; savedCity: string; nearbyPlace: NearbyPlace }>;
  recommendationsLoading?: boolean;
  isPaid?: boolean;
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
  savedPlaces = [],
  isSaved,
  onToggleSave,
  onBack,
  recommendations = [],
  chainMatches = [],
  recommendationsLoading = false,
  isPaid = false,
}: ExploreViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NearbyPlace[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [subView, setSubView] = useState<ExploreSubView>('nearby');
  const [showPaywall, setShowPaywall] = useState(false);

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

  // Auto-focus search input in search mode (no category selected)
  useEffect(() => {
    if (visible && category === null && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [visible, category]);

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
            ref={searchInputRef}
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

      {/* ---- Sub-navigation tabs ---- */}
      <div className="flex gap-2 px-4 pt-14 pb-2" data-testid="explore-sub-nav">
        <button
          data-testid="tab-nearby"
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            subView === 'nearby'
              ? 'bg-[#4A90D9] text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
          onClick={() => setSubView('nearby')}
        >
          Nearby
        </button>
        {isPaid && (
          <button
            data-testid="tab-foryou"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              subView === 'foryou'
                ? 'bg-[#4A90D9] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            onClick={() => setSubView('foryou')}
          >
            For You
          </button>
        )}
        {isPaid && (
          <button
            data-testid="tab-memory"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              subView === 'memory'
                ? 'bg-[#4A90D9] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            onClick={() => {
              setSubView('memory');
            }}
          >
            Memory
          </button>
        )}
        {!isPaid && (
          <button
            data-testid="tab-memory-locked"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/40 hover:bg-white/20 transition-colors"
            onClick={() => setShowPaywall(true)}
          >
            Memory {'\u{1F512}'}
          </button>
        )}
      </div>

      {/* ---- Memory sub-view (paid users) ---- */}
      {subView === 'memory' && isPaid && (
        <div className="flex-1 overflow-y-auto">
          <MemoryTimeline onBack={() => setSubView('nearby')} />
        </div>
      )}

      {/* ---- For You sub-view (paid users) ---- */}
      {subView === 'foryou' && isPaid && hasLocation && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {(recommendations.length > 0 || recommendationsLoading) && (
            <ForYouSection
              recommendations={recommendations}
              loading={recommendationsLoading}
              onPlaceClick={(place) => setSelectedPlace(place)}
            />
          )}
          {chainMatches.length > 0 && (
            <FamiliarSpotsBanner
              matches={chainMatches}
              onTap={(place) => setSelectedPlace(place)}
            />
          )}
          {!recommendationsLoading && recommendations.length === 0 && chainMatches.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 mt-16">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
                {'\u{2728}'}
              </div>
              <p className="text-base font-semibold text-white text-center">No recommendations yet</p>
              <p className="text-sm text-white/50 text-center leading-relaxed">
                Save more places and memories to get personalized suggestions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- Paywall Sheet ---- */}
      <PaywallSheet
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Travel Memories"
      />

      {/* ---- Nearby sub-view (default) ---- */}
      {subView === 'nearby' && (
        <>
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

                  {/* Saved place star markers */}
                  {savedPlaces.map((place) => (
                    <Marker
                      key={`saved-${place.id}`}
                      position={{ lat: place.lat, lng: place.lng }}
                      icon={SAVED_MARKER_ICON}
                      title={place.name}
                      onClick={() => setSelectedPlace(place)}
                    />
                  ))}

                  {/* Place markers */}
                  {displayPlaces.map((place) => {
                    const saved = isSaved?.(place.id) ?? false;
                    return (
                      <Marker
                        key={`${place.id}-${saved ? 's' : 'u'}`}
                        position={{ lat: place.lat, lng: place.lng }}
                        icon={saved ? SAVED_MARKER_ICON : undefined}
                        title={place.name}
                        onClick={() => setSelectedPlace(place)}
                      />
                    );
                  })}

                  {/* Info popup on marker tap */}
                  {selectedPlace && (
                    <InfoWindow
                      position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                      onCloseClick={() => setSelectedPlace(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                            {selectedPlace.name}
                          </div>
                          {selectedPlace.rating !== null && (
                            <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
                              {'★'} {selectedPlace.rating}
                              {selectedPlace.isOpen !== null && (
                                <span style={{ marginLeft: 6, color: selectedPlace.isOpen ? '#16a34a' : '#dc2626' }}>
                                  {selectedPlace.isOpen ? 'Open' : 'Closed'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {onToggleSave && (
                          <button
                            type="button"
                            onClick={() => onToggleSave(selectedPlace)}
                            aria-label={isSaved?.(selectedPlace.id) ? 'Remove saved place' : 'Save place'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              flexShrink: 0,
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
                                fill={isSaved?.(selectedPlace.id) ? '#f5c842' : 'none'}
                                stroke={isSaved?.(selectedPlace.id) ? '#f5c842' : '#999'}
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          )}

          {/* ---- Card carousel (bottom 45%) ---- */}
          {hasLocation && (
            <div
              className="flex-1 flex flex-col px-4 pt-4 pb-6 overflow-y-auto"
              style={{ height: '45%' }}
            >
              {/* Familiar spots banner */}
              {chainMatches.length > 0 && (
                <FamiliarSpotsBanner
                  matches={chainMatches}
                  onTap={(place) => setSelectedPlace(place)}
                />
              )}

              {/* For You section */}
              {(recommendations.length > 0 || recommendationsLoading) && (
                <ForYouSection
                  recommendations={recommendations}
                  loading={recommendationsLoading}
                  onPlaceClick={(place) => setSelectedPlace(place)}
                />
              )}

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
                    <PlaceCard
                      key={place.id}
                      place={place}
                      categoryColor={isSearching ? '#666' : (meta?.color ?? '#666')}
                      isSaved={isSaved?.(place.id)}
                      onToggleSave={onToggleSave ? () => onToggleSave(place) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
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
