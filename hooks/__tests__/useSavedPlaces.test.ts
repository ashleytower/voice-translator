import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedPlaces } from '../useSavedPlaces';
import type { NearbyPlace } from '@/types';

const mockPlace1: NearbyPlace = {
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
};

const mockPlace2: NearbyPlace = {
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
};

const STORAGE_KEY = 'fit-saved-places';

describe('useSavedPlaces', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear localStorage and restore mocks between tests
    localStorage.clear();
    vi.restoreAllMocks();

    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  it('returns empty savedPlaces on initial render', () => {
    const { result } = renderHook(() => useSavedPlaces());

    expect(result.current.savedPlaces).toEqual([]);
  });

  it('adds a place when toggleSave is called with a new place', () => {
    const { result } = renderHook(() => useSavedPlaces());

    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    expect(result.current.savedPlaces).toEqual([mockPlace1]);
    expect(result.current.isSaved(mockPlace1.id)).toBe(true);
  });

  it('removes a place when toggleSave is called with an already-saved place', () => {
    const { result } = renderHook(() => useSavedPlaces());

    // Add the place
    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    expect(result.current.savedPlaces).toHaveLength(1);

    // Toggle again to remove
    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    expect(result.current.savedPlaces).toEqual([]);
    expect(result.current.isSaved(mockPlace1.id)).toBe(false);
  });

  it('isSaved returns true for saved places and false for unsaved', () => {
    const { result } = renderHook(() => useSavedPlaces());

    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    expect(result.current.isSaved(mockPlace1.id)).toBe(true);
    expect(result.current.isSaved(mockPlace2.id)).toBe(false);
  });

  it('persists places across unmount and re-render', () => {
    const { result, unmount } = renderHook(() => useSavedPlaces());

    // Save a place
    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    expect(result.current.savedPlaces).toEqual([mockPlace1]);

    // Verify it was written to localStorage
    expect(setItemSpy).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([mockPlace1])
    );

    // Unmount the hook
    unmount();

    // Re-render -- should load from localStorage
    const { result: result2 } = renderHook(() => useSavedPlaces());

    expect(result2.current.savedPlaces).toEqual([mockPlace1]);
    expect(result2.current.isSaved(mockPlace1.id)).toBe(true);
  });

  it('handles corrupt localStorage data gracefully', () => {
    // Seed localStorage with invalid JSON
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const { result } = renderHook(() => useSavedPlaces());

    // Should fall back to empty array without throwing
    expect(result.current.savedPlaces).toEqual([]);
  });

  it('handles localStorage getItem throwing an error', () => {
    getItemSpy.mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    const { result } = renderHook(() => useSavedPlaces());

    expect(result.current.savedPlaces).toEqual([]);
  });

  it('handles localStorage setItem throwing an error without crashing', () => {
    setItemSpy.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useSavedPlaces());

    // Should not throw when toggling even if setItem fails
    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    // State should still update in memory even if persist fails
    expect(result.current.savedPlaces).toEqual([mockPlace1]);
  });

  it('can save multiple places', () => {
    const { result } = renderHook(() => useSavedPlaces());

    act(() => {
      result.current.toggleSave(mockPlace1);
    });

    act(() => {
      result.current.toggleSave(mockPlace2);
    });

    expect(result.current.savedPlaces).toHaveLength(2);
    expect(result.current.isSaved(mockPlace1.id)).toBe(true);
    expect(result.current.isSaved(mockPlace2.id)).toBe(true);
  });
});
