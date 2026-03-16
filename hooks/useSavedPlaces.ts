'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NearbyPlace } from '@/types';

const STORAGE_KEY = 'fit-saved-places';

export interface UseSavedPlacesReturn {
  savedPlaces: NearbyPlace[];
  toggleSave: (place: NearbyPlace) => void;
  isSaved: (placeId: string) => boolean;
}

function loadFromStorage(): NearbyPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Corrupt data or localStorage unavailable -- fall back to empty
  }
  return [];
}

function persistToStorage(places: NearbyPlace[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // Quota exceeded or localStorage unavailable -- silently ignore
  }
}

export function useSavedPlaces(): UseSavedPlacesReturn {
  const [savedPlaces, setSavedPlaces] = useState<NearbyPlace[]>(loadFromStorage);

  // Persist to localStorage whenever savedPlaces changes
  useEffect(() => {
    persistToStorage(savedPlaces);
  }, [savedPlaces]);

  const toggleSave = useCallback((place: NearbyPlace) => {
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      if (exists) {
        return prev.filter((p) => p.id !== place.id);
      }
      return [...prev, place];
    });
  }, []);

  const isSaved = useCallback(
    (placeId: string): boolean => {
      return savedPlaces.some((p) => p.id === placeId);
    },
    [savedPlaces]
  );

  return { savedPlaces, toggleSave, isSaved };
}
