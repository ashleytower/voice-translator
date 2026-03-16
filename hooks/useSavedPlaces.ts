'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NearbyPlace } from '@/types';
import { saveMemory } from '@/lib/memory';
import { createClient } from '@/lib/supabase';

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

/**
 * Convert a Supabase memory_node (type='place') into a NearbyPlace.
 * Falls back to sensible defaults for fields that memory_nodes may not carry.
 */
function memoryNodeToPlace(metadata: Record<string, unknown>): NearbyPlace | null {
  const placeId = metadata.place_id as string | undefined;
  const name = metadata.name as string | undefined;
  if (!placeId || !name) return null;

  return {
    id: placeId,
    name,
    address: (metadata.address as string) ?? '',
    lat: (metadata.lat as number) ?? 0,
    lng: (metadata.lng as number) ?? 0,
    rating: null,
    ratingCount: 0,
    isOpen: null,
    phone: null,
    photoUrl: null,
    type: (metadata.type as string) ?? 'place',
    priceLevel: null,
  };
}

export function useSavedPlaces(userId?: string): UseSavedPlacesReturn {
  const [savedPlaces, setSavedPlaces] = useState<NearbyPlace[]>(loadFromStorage);

  // Persist to localStorage whenever savedPlaces changes
  useEffect(() => {
    persistToStorage(savedPlaces);
  }, [savedPlaces]);

  // For authenticated users, merge Supabase memory_nodes into localStorage
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from('memory_nodes')
      .select('metadata')
      .eq('user_id', userId)
      .eq('type', 'place')
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        setSavedPlaces((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPlaces: NearbyPlace[] = [];

          for (const node of data) {
            const place = memoryNodeToPlace(node.metadata as Record<string, unknown>);
            if (place && !existingIds.has(place.id)) {
              newPlaces.push(place);
            }
          }

          if (newPlaces.length === 0) return prev;
          return [...prev, ...newPlaces];
        });
      });
  }, [userId]);

  const toggleSave = useCallback((place: NearbyPlace) => {
    let wasAdded = false;
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      if (exists) {
        return prev.filter((p) => p.id !== place.id);
      }
      wasAdded = true;
      return [...prev, place];
    });
    // Fire-and-forget: persist to memory layer when a place is saved
    if (wasAdded) {
      saveMemory('place', `Saved ${place.name} at ${place.address}`, {
        place_id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      });
    }
  }, []);

  const isSaved = useCallback(
    (placeId: string): boolean => {
      return savedPlaces.some((p) => p.id === placeId);
    },
    [savedPlaces]
  );

  return { savedPlaces, toggleSave, isSaved };
}
