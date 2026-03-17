import type { NearbyPlace } from '@/types'

export interface ChainMatch {
  savedPlaceName: string
  savedCity: string
  nearbyPlace: NearbyPlace
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  // Use a single flat array instead of a 2D matrix for efficiency
  let prev = Array.from({ length: bLen + 1 }, (_, i) => i)
  let curr = new Array<number>(bLen + 1)

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      )
    }
    // Swap rows
    const tmp = prev
    prev = curr
    curr = tmp
  }

  return prev[bLen]
}

/**
 * Normalize a place name for matching.
 * Lowercases, trims, and removes common location suffixes like " - Tokyo", " Shibuya", etc.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove trailing location suffixes: " - CityName", " (CityName)", " CityName Branch"
    .replace(/\s*[-\u2013\u2014]\s*\w[\w\s]*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+(branch|store|shop|outlet|location)\s*$/i, '')
    .trim()
}

interface SavedPlace {
  name: string
  city: string | null
}

interface MatchCandidate {
  savedPlace: SavedPlace
  nearbyPlace: NearbyPlace
  distance: number
}

/**
 * Find saved place names that match nearby places.
 * Uses case-insensitive substring matching after normalization.
 * Returns matches where the saved place city is different from the current city (cross-city matches only).
 */
export function findChainMatches(
  savedPlaces: Array<{ name: string; city: string | null }>,
  nearbyPlaces: NearbyPlace[]
): ChainMatch[] {
  const candidates: MatchCandidate[] = []

  for (const saved of savedPlaces) {
    if (!saved.name || typeof saved.name !== 'string') continue

    const savedNorm = normalizeName(saved.name)
    if (savedNorm.length === 0) continue

    for (const nearby of nearbyPlaces) {
      if (!nearby.name || typeof nearby.name !== 'string') continue

      const nearbyNorm = normalizeName(nearby.name)
      if (nearbyNorm.length === 0) continue

      let matched = false
      let distance = Infinity

      // Check substring match (either direction)
      if (nearbyNorm.includes(savedNorm) || savedNorm.includes(nearbyNorm)) {
        matched = true
        distance = Math.abs(nearbyNorm.length - savedNorm.length)
      }

      // For short names (< 15 chars), also check Levenshtein distance <= 3
      if (!matched && savedNorm.length < 15 && nearbyNorm.length < 15) {
        const lev = levenshtein(savedNorm, nearbyNorm)
        if (lev <= 3) {
          matched = true
          distance = lev
        }
      }

      if (!matched) continue

      // Cross-city matches only: skip if saved city matches nearby location
      // If saved city is null, we can't confirm it's cross-city, so skip
      if (!saved.city || typeof saved.city !== 'string') continue

      candidates.push({
        savedPlace: saved,
        nearbyPlace: nearby,
        distance,
      })
    }
  }

  // Deduplicate: if multiple saved places match the same nearby place,
  // keep the one with the shortest distance
  const bestByNearbyId = new Map<string, MatchCandidate>()

  for (const candidate of candidates) {
    const existing = bestByNearbyId.get(candidate.nearbyPlace.id)
    if (!existing || candidate.distance < existing.distance) {
      bestByNearbyId.set(candidate.nearbyPlace.id, candidate)
    }
  }

  return Array.from(bestByNearbyId.values()).map((c) => ({
    savedPlaceName: c.savedPlace.name,
    savedCity: c.savedPlace.city ?? '',
    nearbyPlace: c.nearbyPlace,
  }))
}
