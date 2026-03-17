'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NearbyPlace } from '@/types';

interface Recommendation {
  place: NearbyPlace;
  explanation: string;
}

interface ChainMatch {
  savedPlaceName: string;
  savedCity: string;
  nearbyPlace: NearbyPlace;
}

export interface UseRecommendationsResult {
  recommendations: Recommendation[];
  chainMatches: ChainMatch[];
  loading: boolean;
}

/** Minimum distance in meters before triggering a refetch (~500m). */
const REFETCH_THRESHOLD_M = 500;

/**
 * Approximate distance between two lat/lng points using the Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Safely access a property on an unknown value after confirming it is an object.
 * Returns undefined if the key does not exist.
 */
function prop(obj: object, key: string): unknown {
  const record: Record<string, unknown> = Object.create(null);
  for (const [k, v] of Object.entries(obj)) {
    record[k] = v;
  }
  return record[key];
}

function isNearbyPlace(value: unknown): value is NearbyPlace {
  if (typeof value !== 'object' || value === null) return false;
  return (
    typeof prop(value, 'id') === 'string' &&
    typeof prop(value, 'name') === 'string' &&
    typeof prop(value, 'address') === 'string' &&
    typeof prop(value, 'lat') === 'number' &&
    typeof prop(value, 'lng') === 'number' &&
    typeof prop(value, 'ratingCount') === 'number' &&
    typeof prop(value, 'type') === 'string'
  );
}

function isRecommendation(value: unknown): value is Recommendation {
  if (typeof value !== 'object' || value === null) return false;
  return typeof prop(value, 'explanation') === 'string' && isNearbyPlace(prop(value, 'place'));
}

function isChainMatch(value: unknown): value is ChainMatch {
  if (typeof value !== 'object' || value === null) return false;
  return (
    typeof prop(value, 'savedPlaceName') === 'string' &&
    typeof prop(value, 'savedCity') === 'string' &&
    isNearbyPlace(prop(value, 'nearbyPlace'))
  );
}

export function useRecommendations(
  lat: number | null,
  lng: number | null,
  isPaid: boolean
): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [chainMatches, setChainMatches] = useState<ChainMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const prevPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRecommendations = useCallback(
    async (latitude: number, longitude: number) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const url = `/api/memories/recommend?lat=${latitude}&lng=${longitude}`;
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`Recommendations fetch failed (${res.status})`);
        }

        const data: unknown = await res.json();

        if (typeof data !== 'object' || data === null) {
          setRecommendations([]);
          setChainMatches([]);
          return;
        }

        // Parse recommendations
        const rawRecs = prop(data, 'recommendations');
        const validRecs = Array.isArray(rawRecs)
          ? rawRecs.filter(isRecommendation)
          : [];
        setRecommendations(validRecs);

        // Parse chain matches
        const rawMatches = prop(data, 'chainMatches');
        const validMatches = Array.isArray(rawMatches)
          ? rawMatches.filter(isChainMatch)
          : [];
        setChainMatches(validMatches);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setRecommendations([]);
        setChainMatches([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isPaid || lat === null || lng === null) {
      setRecommendations([]);
      setChainMatches([]);
      setLoading(false);
      return;
    }

    // Check if position changed enough to refetch
    const prev = prevPositionRef.current;
    if (prev !== null) {
      const distance = haversineDistance(prev.lat, prev.lng, lat, lng);
      if (distance < REFETCH_THRESHOLD_M) {
        return;
      }
    }

    prevPositionRef.current = { lat, lng };
    fetchRecommendations(lat, lng);

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [lat, lng, isPaid, fetchRecommendations]);

  return { recommendations, chainMatches, loading };
}
