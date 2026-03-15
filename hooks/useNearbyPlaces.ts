'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NearbyPlace, PlaceCategory } from '@/types';

interface UseNearbyPlacesReturn {
  places: NearbyPlace[];
  loading: boolean;
  error: string | null;
}

export function useNearbyPlaces(
  lat: number | null,
  lng: number | null,
  category: PlaceCategory | null
): UseNearbyPlacesReturn {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<PlaceCategory, NearbyPlace[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPlaces = useCallback(
    async (latitude: number, longitude: number, cat: PlaceCategory) => {
      // Check cache first
      const cached = cacheRef.current.get(cat);
      if (cached) {
        setPlaces(cached);
        setLoading(false);
        setError(null);
        return;
      }

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const url = `/api/places/nearby?lat=${latitude}&lng=${longitude}&type=${cat}&radius=1000`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch nearby places (${response.status})`);
        }

        const data = await response.json();
        const fetchedPlaces: NearbyPlace[] = Array.isArray(data) ? data : data.places ?? [];

        // Store in cache
        cacheRef.current.set(cat, fetchedPlaces);

        setPlaces(fetchedPlaces);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Failed to fetch nearby places';
        setError(message);
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (lat === null || lng === null || category === null) {
      setPlaces([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchPlaces(lat, lng, category);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [lat, lng, category, fetchPlaces]);

  return { places, loading, error };
}
