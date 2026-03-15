import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNearbyPlaces } from '../useNearbyPlaces';
import type { NearbyPlace } from '@/types';

const mockPlaces: NearbyPlace[] = [
  {
    id: 'place-1',
    name: 'Sushi Ichiban',
    address: '1-2-3 Shibuya, Tokyo',
    lat: 35.6595,
    lng: 139.7004,
    rating: 4.5,
    ratingCount: 120,
    isOpen: true,
    phone: '+81-3-1234-5678',
    photoUrl: 'https://example.com/photo1.jpg',
    type: 'restaurant',
    priceLevel: '$$',
  },
  {
    id: 'place-2',
    name: 'Ramen Jiro',
    address: '4-5-6 Shinjuku, Tokyo',
    lat: 35.6938,
    lng: 139.7034,
    rating: 4.2,
    ratingCount: 85,
    isOpen: false,
    phone: null,
    photoUrl: null,
    type: 'restaurant',
    priceLevel: '$',
  },
];

function createFetchResponse(data: NearbyPlace[]) {
  return {
    ok: true,
    json: () => Promise.resolve({ places: data }),
  } as Response;
}

describe('useNearbyPlaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty places and loading=false when category is null', () => {
    const { result } = renderHook(() =>
      useNearbyPlaces(35.6595, 139.7004, null)
    );

    expect(result.current.places).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when lat is null', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() =>
      useNearbyPlaces(null, 139.7004, 'restaurant')
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.places).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when lng is null', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() =>
      useNearbyPlaces(35.6595, null, 'restaurant')
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.places).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns places for valid params', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      createFetchResponse(mockPlaces)
    );

    const { result } = renderHook(() =>
      useNearbyPlaces(35.6595, 139.7004, 'restaurant')
    );

    // Should start loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual(mockPlaces);
    expect(result.current.error).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/places/nearby?lat=35.6595&lng=139.7004&type=restaurant&radius=1000',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' }),
    } as Response);

    const { result } = renderHook(() =>
      useNearbyPlaces(35.6595, 139.7004, 'restaurant')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it('returns error on network exception', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Network failure')
    );

    const { result } = renderHook(() =>
      useNearbyPlaces(35.6595, 139.7004, 'pharmacy')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual([]);
    expect(result.current.error).toBe('Network failure');
  });

  it('uses cache on repeated category selection (fetch called only once)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createFetchResponse(mockPlaces)
    );

    const { result, rerender } = renderHook(
      ({ lat, lng, category }) => useNearbyPlaces(lat, lng, category),
      {
        initialProps: {
          lat: 35.6595 as number | null,
          lng: 139.7004 as number | null,
          category: 'restaurant' as 'restaurant' | 'train_station' | 'convenience_store' | 'pharmacy' | 'atm' | null,
        },
      }
    );

    // Wait for first fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual(mockPlaces);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Switch to a different category (null) then back
    rerender({ lat: 35.6595, lng: 139.7004, category: null });

    expect(result.current.places).toEqual([]);

    // Switch back to original category -- should use cache
    rerender({ lat: 35.6595, lng: 139.7004, category: 'restaurant' });

    // Cache hit: no additional fetch, places restored immediately
    await waitFor(() => {
      expect(result.current.places).toEqual(mockPlaces);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches separately for different categories', async () => {
    const pharmacyPlaces: NearbyPlace[] = [
      {
        id: 'place-3',
        name: 'Matsumoto Kiyoshi',
        address: '7-8-9 Ikebukuro, Tokyo',
        lat: 35.7295,
        lng: 139.7109,
        rating: 4.0,
        ratingCount: 200,
        isOpen: true,
        phone: '+81-3-9876-5432',
        photoUrl: null,
        type: 'pharmacy',
        priceLevel: null,
      },
    ];

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(createFetchResponse(mockPlaces))
      .mockResolvedValueOnce(createFetchResponse(pharmacyPlaces));

    const { result, rerender } = renderHook(
      ({ category }) =>
        useNearbyPlaces(35.6595, 139.7004, category),
      {
        initialProps: {
          category: 'restaurant' as 'restaurant' | 'train_station' | 'convenience_store' | 'pharmacy' | 'atm' | null,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual(mockPlaces);

    // Switch to pharmacy
    rerender({ category: 'pharmacy' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.places).toEqual(pharmacyPlaces);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
