# Google Maps Explore View -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Explore tab with a Google Map showing the user's location and nearby places (restaurants, stations, konbini, pharmacies, ATMs) with detail sheets on tap.

**Architecture:** Client-side map rendering via `@vis.gl/react-google-maps`. Server-side Places API calls from Next.js API routes for cost control (field masks). New `'explore'` ViewMode added to the existing tab navigation. Place detail displayed in a bottom sheet using the existing Radix UI Sheet component. Geolocation via browser `navigator.geolocation`.

**Tech Stack:** @vis.gl/react-google-maps, Google Places API (New), Next.js API routes, Tailwind CSS, Radix UI Sheet, Vitest

**Future Phases (not in this plan):**
- Phase 2: One-tap "Call to Reserve" via Vapi, translated review summaries, directions, "Get Me Back" button
- Phase 3: Voice-powered map queries via Gemini Maps Grounding, context-aware phrasebook
- Phase 4: Price-level filtering, location-tagged phrasebook, offline caching

---

## Task 1: Add `'explore'` to ViewMode and install map library

**Files:**
- Modify: `types.ts:112`
- Modify: `package.json` (install dependency)

**Step 1: Update ViewMode type**

In `types.ts`, change line 112 from:
```typescript
export type ViewMode = 'translate' | 'camera' | 'convert' | 'settings' | 'phrases';
```
to:
```typescript
export type ViewMode = 'translate' | 'camera' | 'convert' | 'settings' | 'phrases' | 'explore';
```

**Step 2: Install the Google Maps React library**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npm install @vis.gl/react-google-maps
```

Expected: Package installs without errors. Check `package.json` shows `@vis.gl/react-google-maps` in dependencies.

**Step 3: Run existing tests to make sure nothing breaks**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run
```

Expected: All existing tests PASS. The ViewMode union change is additive so nothing should break.

**Step 4: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add types.ts package.json package-lock.json
git commit -m "feat: add 'explore' ViewMode and install @vis.gl/react-google-maps"
```

---

## Task 2: Create the `useGeolocation` hook

**Files:**
- Create: `hooks/useGeolocation.ts`
- Create: `hooks/useGeolocation.test.ts`

**Step 1: Write the failing test**

Create `hooks/useGeolocation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null position initially', () => {
    // Mock geolocation not available
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.position).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('returns position when geolocation succeeds', async () => {
    const mockPosition = {
      coords: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
    };

    const watchPositionMock = vi.fn((success) => {
      success(mockPosition);
      return 1;
    });
    const clearWatchMock = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.position).toEqual({
      lat: 35.6762,
      lng: 139.6503,
    });
    expect(result.current.error).toBeNull();
  });

  it('returns error when geolocation fails', () => {
    const watchPositionMock = vi.fn((_success, error) => {
      error({ code: 1, message: 'User denied' });
      return 1;
    });

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        watchPosition: watchPositionMock,
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.position).toBeNull();
    expect(result.current.error).toBe('User denied');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run hooks/useGeolocation.test.ts
```

Expected: FAIL -- module `./useGeolocation` not found.

**Step 3: Write minimal implementation**

Create `hooks/useGeolocation.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Position {
  lat: number;
  lng: number;
}

interface GeolocationState {
  position: Position | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error, loading };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run hooks/useGeolocation.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add hooks/useGeolocation.ts hooks/useGeolocation.test.ts
git commit -m "feat: add useGeolocation hook with tests"
```

---

## Task 3: Create the Places API server route

**Files:**
- Create: `app/api/places/nearby/route.ts`
- Create: `lib/places-types.ts`

**Step 1: Create shared types for places**

Create `lib/places-types.ts`:

```typescript
export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types: string[];
  primaryType?: string;
  isOpen?: boolean;
  phone?: string;
  hours?: string[];
  photoUrl?: string;
}

export type PlaceCategory = 'restaurant' | 'train_station' | 'convenience_store' | 'pharmacy' | 'atm';

export const PLACE_CATEGORIES: Record<PlaceCategory, { label: string; type: string; icon: string }> = {
  restaurant: { label: 'Restaurants', type: 'restaurant', icon: 'UtensilsCrossed' },
  train_station: { label: 'Stations', type: 'train_station', icon: 'Train' },
  convenience_store: { label: 'Konbini', type: 'convenience_store', icon: 'Store' },
  pharmacy: { label: 'Pharmacy', type: 'pharmacy', icon: 'Pill' },
  atm: { label: 'ATM', type: 'atm', icon: 'Banknote' },
};
```

**Step 2: Create the API route**

Create `app/api/places/nearby/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { PlaceResult } from '@/lib/places-types';

const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export async function POST(req: NextRequest) {
  if (!GOOGLE_MAPS_SERVER_KEY) {
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 });
  }

  const { lat, lng, type, radius = 1000 } = await req.json();

  if (!lat || !lng || !type) {
    return NextResponse.json({ error: 'lat, lng, and type are required' }, { status: 400 });
  }

  try {
    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.types',
          'places.primaryType',
          'places.currentOpeningHours',
          'places.internationalPhoneNumber',
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
        rankPreference: 'DISTANCE',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API error:', errorText);
      return NextResponse.json({ error: 'Places API request failed' }, { status: response.status });
    }

    const data = await response.json();
    const places: PlaceResult[] = (data.places || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: (p.displayName as Record<string, string>)?.text ?? '',
      address: p.formattedAddress as string ?? '',
      location: {
        lat: (p.location as Record<string, number>)?.latitude ?? 0,
        lng: (p.location as Record<string, number>)?.longitude ?? 0,
      },
      rating: p.rating as number | undefined,
      userRatingCount: p.userRatingCount as number | undefined,
      priceLevel: p.priceLevel as string | undefined,
      types: (p.types as string[]) ?? [],
      primaryType: p.primaryType as string | undefined,
      isOpen: (p.currentOpeningHours as Record<string, unknown>)?.openNow as boolean | undefined,
      phone: p.internationalPhoneNumber as string | undefined,
      hours: ((p.currentOpeningHours as Record<string, unknown>)?.weekdayDescriptions as string[]) ?? [],
    }));

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}
```

**Step 3: Run existing tests to make sure nothing breaks**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run
```

Expected: All existing tests PASS. (API routes are not unit-tested here -- they'll be integration-tested via the UI.)

**Step 4: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add lib/places-types.ts app/api/places/nearby/route.ts
git commit -m "feat: add Places API nearby search server route and place types"
```

---

## Task 4: Create the `useNearbyPlaces` hook

**Files:**
- Create: `hooks/useNearbyPlaces.ts`
- Create: `hooks/useNearbyPlaces.test.ts`

**Step 1: Write the failing test**

Create `hooks/useNearbyPlaces.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNearbyPlaces } from './useNearbyPlaces';
import type { PlaceCategory } from '@/lib/places-types';

describe('useNearbyPlaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty places and loading=false when position is null', () => {
    const { result } = renderHook(() =>
      useNearbyPlaces(null, 'restaurant')
    );
    expect(result.current.places).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches places when position and category are provided', async () => {
    const mockPlaces = [
      { id: '1', name: 'Ramen Shop', address: 'Tokyo', location: { lat: 35.67, lng: 139.65 }, types: ['restaurant'] },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ places: mockPlaces }),
    });

    const position = { lat: 35.6762, lng: 139.6503 };
    const { result } = renderHook(() =>
      useNearbyPlaces(position, 'restaurant')
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual(mockPlaces);
    expect(global.fetch).toHaveBeenCalledWith('/api/places/nearby', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('sets error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' }),
    });

    const position = { lat: 35.6762, lng: 139.6503 };
    const { result } = renderHook(() =>
      useNearbyPlaces(position, 'restaurant')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.places).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run hooks/useNearbyPlaces.test.ts
```

Expected: FAIL -- module `./useNearbyPlaces` not found.

**Step 3: Write minimal implementation**

Create `hooks/useNearbyPlaces.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import type { PlaceResult, PlaceCategory } from '@/lib/places-types';

interface Position {
  lat: number;
  lng: number;
}

interface NearbyPlacesState {
  places: PlaceResult[];
  loading: boolean;
  error: string | null;
}

export function useNearbyPlaces(
  position: Position | null,
  category: PlaceCategory
): NearbyPlacesState {
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/places/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: position.lat,
        lng: position.lng,
        type: category,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch places');
        const data = await res.json();
        if (!cancelled) {
          setPlaces(data.places || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setPlaces([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [position?.lat, position?.lng, category]);

  return { places, loading, error };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run hooks/useNearbyPlaces.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add hooks/useNearbyPlaces.ts hooks/useNearbyPlaces.test.ts
git commit -m "feat: add useNearbyPlaces hook with server-side Places API fetch"
```

---

## Task 5: Create the ExploreView component

**Files:**
- Create: `components/explore/ExploreView.tsx`
- Create: `components/explore/CategoryChips.tsx`
- Create: `components/explore/PlaceSheet.tsx`

**Step 1: Create the CategoryChips component**

Create `components/explore/CategoryChips.tsx`:

```tsx
'use client';

import React from 'react';
import { UtensilsCrossed, Train, Store, Pill, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaceCategory } from '@/lib/places-types';

const CATEGORIES: { key: PlaceCategory; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'restaurant', label: 'Eat', Icon: UtensilsCrossed },
  { key: 'train_station', label: 'Trains', Icon: Train },
  { key: 'convenience_store', label: 'Konbini', Icon: Store },
  { key: 'pharmacy', label: 'Pharmacy', Icon: Pill },
  { key: 'atm', label: 'ATM', Icon: Banknote },
];

interface CategoryChipsProps {
  selected: PlaceCategory;
  onSelect: (category: PlaceCategory) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ selected, onSelect }) => (
  <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
    {CATEGORIES.map(({ key, label, Icon }) => (
      <button
        key={key}
        onClick={() => onSelect(key)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
          selected === key
            ? 'bg-[#64B5F6] text-white'
            : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);
```

**Step 2: Create the PlaceSheet component**

Create `components/explore/PlaceSheet.tsx`:

```tsx
'use client';

import React from 'react';
import { Star, Clock, Phone, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaceResult } from '@/lib/places-types';

interface PlaceSheetProps {
  place: PlaceResult | null;
  onClose: () => void;
}

export const PlaceSheet: React.FC<PlaceSheetProps> = ({ place, onClose }) => {
  if (!place) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 animate-fade-up">
      <div className="mx-3 mb-3 rounded-2xl bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/[0.08] p-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Name and rating */}
        <h3 className="text-base font-semibold text-foreground pr-10 leading-tight">
          {place.name}
        </h3>

        <div className="flex items-center gap-3 mt-1.5">
          {place.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs text-foreground font-medium">{place.rating}</span>
              {place.userRatingCount && (
                <span className="text-xs text-muted-foreground">({place.userRatingCount})</span>
              )}
            </div>
          )}
          {place.isOpen !== undefined && (
            <span className={cn(
              'text-xs font-medium',
              place.isOpen ? 'text-emerald-400' : 'text-red-400'
            )}>
              {place.isOpen ? 'Open' : 'Closed'}
            </span>
          )}
          {place.priceLevel && (
            <span className="text-xs text-muted-foreground">
              {place.priceLevel.replace('PRICE_LEVEL_', '')}
            </span>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 mt-3">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs text-muted-foreground leading-relaxed">{place.address}</span>
        </div>

        {/* Phone */}
        {place.phone && (
          <div className="flex items-center gap-2 mt-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <a
              href={`tel:${place.phone}`}
              className="text-xs text-[#64B5F6] hover:underline"
            >
              {place.phone}
            </a>
          </div>
        )}

        {/* Hours */}
        {place.hours && place.hours.length > 0 && (
          <details className="mt-3">
            <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Hours
            </summary>
            <ul className="mt-1.5 pl-5.5 space-y-0.5">
              {place.hours.map((h, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">{h}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
};
```

**Step 3: Create the ExploreView component**

Create `components/explore/ExploreView.tsx`:

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { CategoryChips } from './CategoryChips';
import { PlaceSheet } from './PlaceSheet';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';
import type { PlaceCategory, PlaceResult } from '@/lib/places-types';
import { MapPin, Loader2 } from 'lucide-react';

// Dynamic import to avoid SSR issues with Google Maps
const MapContainer = dynamic(() => import('./MapContainer'), { ssr: false });

interface ExploreViewProps {
  onSettingsClick: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onSettingsClick }) => {
  const [category, setCategory] = useState<PlaceCategory>('restaurant');
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const { places, loading: placesLoading } = useNearbyPlaces(position, category);

  const handleMarkerClick = useCallback((place: PlaceResult) => {
    setSelectedPlace(place);
  }, []);

  const handleCategoryChange = useCallback((cat: PlaceCategory) => {
    setCategory(cat);
    setSelectedPlace(null);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header onSettingsClick={onSettingsClick} />
      <CategoryChips selected={category} onSelect={handleCategoryChange} />

      <div className="relative flex-1">
        {geoLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Finding your location...</p>
          </div>
        ) : geoError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Enable location access to explore nearby places.
            </p>
            <p className="text-xs text-muted-foreground/50">{geoError}</p>
          </div>
        ) : position ? (
          <>
            <MapContainer
              center={position}
              places={places}
              selectedPlace={selectedPlace}
              onMarkerClick={handleMarkerClick}
              onMapClick={() => setSelectedPlace(null)}
            />
            {placesLoading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[#1C1C1E]/90 backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground">Searching...</span>
              </div>
            )}
            <PlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />
          </>
        ) : null}
      </div>
    </div>
  );
};
```

**Step 4: Create the MapContainer component (dynamically imported)**

Create `components/explore/MapContainer.tsx`:

```tsx
'use client';

import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { PlaceResult } from '@/lib/places-types';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || '';

// Dark map style matching the app aesthetic
const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a0ae' }] },
];

interface MapContainerProps {
  center: { lat: number; lng: number };
  places: PlaceResult[];
  selectedPlace: PlaceResult | null;
  onMarkerClick: (place: PlaceResult) => void;
  onMapClick: () => void;
}

const MapContainer: React.FC<MapContainerProps> = ({
  center,
  places,
  selectedPlace,
  onMarkerClick,
  onMapClick,
}) => {
  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Map
        defaultZoom={15}
        defaultCenter={center}
        mapId={MAP_ID}
        styles={!MAP_ID ? DARK_MAP_STYLES : undefined}
        disableDefaultUI
        gestureHandling="greedy"
        onClick={onMapClick}
        className="w-full h-full"
      >
        {/* User location marker */}
        <AdvancedMarker position={center}>
          <div className="w-4 h-4 rounded-full bg-[#64B5F6] border-2 border-white shadow-lg" />
        </AdvancedMarker>

        {/* Place markers */}
        {places.map((place) => (
          <AdvancedMarker
            key={place.id}
            position={place.location}
            onClick={() => onMarkerClick(place)}
          >
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all ${
                selectedPlace?.id === place.id
                  ? 'bg-amber-400 border-amber-300 scale-150'
                  : 'bg-orange-500 border-orange-300'
              }`}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
};

export default MapContainer;
```

**Step 5: Run existing tests to make sure nothing breaks**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run
```

Expected: All existing tests PASS.

**Step 6: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/explore/ExploreView.tsx components/explore/CategoryChips.tsx components/explore/PlaceSheet.tsx components/explore/MapContainer.tsx
git commit -m "feat: add ExploreView with Google Map, category chips, and place detail sheet"
```

---

## Task 6: Add Explore tab to BottomNav

**Files:**
- Modify: `components/layout/BottomNav.tsx:4,16-28`
- Modify: `components/layout/BottomNav.test.tsx`

**Step 1: Update the BottomNav test to expect Explore tab**

Add to the existing test file `components/layout/BottomNav.test.tsx`:

```typescript
// Add this test to the existing describe block:
it('renders Explore tab', () => {
  render(<BottomNav activeTab="translate" onTabChange={vi.fn()} />);
  expect(screen.getByText('Explore')).toBeInTheDocument();
});

it('calls onTabChange with "explore" when Explore is clicked', () => {
  const onTabChange = vi.fn();
  render(<BottomNav activeTab="translate" onTabChange={onTabChange} />);
  fireEvent.click(screen.getByText('Explore'));
  expect(onTabChange).toHaveBeenCalledWith('explore');
});

// Update the "renders all four tabs" test name and assertion:
it('renders all five tabs with labels', () => {
  render(<BottomNav activeTab="translate" onTabChange={vi.fn()} />);
  expect(screen.getByText('Translate')).toBeInTheDocument();
  expect(screen.getByText('Scan')).toBeInTheDocument();
  expect(screen.getByText('Explore')).toBeInTheDocument();
  expect(screen.getByText('Convert')).toBeInTheDocument();
  expect(screen.getByText('Phrases')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/layout/BottomNav.test.tsx
```

Expected: FAIL -- cannot find text "Explore"

**Step 3: Update BottomNav to add Explore tab**

In `components/layout/BottomNav.tsx`:

Add `Compass` to the lucide-react import:
```typescript
import { Mic, ScanLine, ArrowLeftRight, BookmarkCheck, Compass } from 'lucide-react';
```

Add explore to `LEFT_TABS` (after Scan, making it the last left tab before the orb):
```typescript
const LEFT_TABS: NavTab[] = [
  {
    viewMode: 'translate',
    label: 'Translate',
    icon: <Mic className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <Mic className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'camera',
    label: 'Scan',
    icon: <ScanLine className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <ScanLine className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
];

const RIGHT_TABS: NavTab[] = [
  {
    viewMode: 'explore',
    label: 'Explore',
    icon: <Compass className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <Compass className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'convert',
    label: 'Convert',
    icon: <ArrowLeftRight className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <ArrowLeftRight className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    viewMode: 'phrases',
    label: 'Phrases',
    icon: <BookmarkCheck className="h-[22px] w-[22px]" strokeWidth={1.5} />,
    activeIcon: <BookmarkCheck className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
];
```

**Note:** This puts the layout as: `[Translate, Scan] [Orb] [Explore, Convert, Phrases]` -- 5 tabs + orb. If 6 items feels too crowded, an alternative is to move Explore into LEFT_TABS (3 left + orb + 2 right). The implementer should test visually and adjust.

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/layout/BottomNav.test.tsx
```

Expected: PASS (all tests including the new Explore tests)

**Step 5: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/layout/BottomNav.tsx components/layout/BottomNav.test.tsx
git commit -m "feat: add Explore tab to BottomNav"
```

---

## Task 7: Wire ExploreView into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Import ExploreView**

Add to the imports in `app/page.tsx` (after the other component imports):
```typescript
import { ExploreView } from '@/components/explore/ExploreView';
```

**Step 2: Add explore case to renderCurrentView**

In `app/page.tsx`, inside the `renderCurrentView` switch statement, add before the `default` case:
```typescript
case 'explore':
  return (
    <ExploreView onSettingsClick={handleSettingsClick} />
  );
```

**Step 3: Also hide BottomNav during explore mode (optional -- may want to keep it)**

The BottomNav should remain visible during explore mode so users can navigate back. No change needed to the `activeTab === 'camera'` check -- explore is not camera.

**Step 4: Run all tests**

Run:
```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run
```

Expected: All tests PASS.

**Step 5: Add env vars to `.env.local` (manual step)**

The implementer must create or update `.env.local` with:
```
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_client_key_here
NEXT_PUBLIC_GOOGLE_MAP_ID=your_map_id_here
GOOGLE_MAPS_SERVER_KEY=your_server_key_here
```

**Note:** `NEXT_PUBLIC_GOOGLE_MAP_ID` is optional -- if not set, the dark styles array will be used instead of cloud-based styling. AdvancedMarker requires a Map ID; if missing, the map will still render but markers may fall back to basic pins.

**Step 6: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add app/page.tsx
git commit -m "feat: wire ExploreView into page routing"
```

---

## Task 8: Manual visual verification

**Steps:**

1. Ensure `.env.local` has valid Google Maps API keys
2. Run `npm run dev` in the voice-translator directory
3. Open `http://localhost:3000` on mobile or in responsive mode
4. Tap the Explore tab in the bottom nav
5. Allow location access when prompted
6. Verify:
   - Map renders with dark styling
   - Blue dot shows your current location
   - Category chips appear above the map (Eat, Trains, Konbini, Pharmacy, ATM)
   - Tapping a category fetches and shows place markers (orange dots)
   - Tapping a place marker shows the detail sheet with name, rating, hours, phone, address
   - Tapping the X or the map closes the sheet
   - Bottom nav remains visible and functional
   - Orb remains in center of nav bar
7. Test error state: deny location access, verify helpful error message appears

**No commit needed -- this is verification only.**

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | ViewMode type + install library | `types.ts`, `package.json` |
| 2 | useGeolocation hook | `hooks/useGeolocation.ts`, test |
| 3 | Places API server route | `app/api/places/nearby/route.ts`, `lib/places-types.ts` |
| 4 | useNearbyPlaces hook | `hooks/useNearbyPlaces.ts`, test |
| 5 | ExploreView + MapContainer + CategoryChips + PlaceSheet | `components/explore/*` |
| 6 | Explore tab in BottomNav | `components/layout/BottomNav.tsx`, test |
| 7 | Wire into page.tsx | `app/page.tsx` |
| 8 | Manual visual verification | None |
