import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import type { NearbyPlace } from '@/types'
import { findChainMatches } from '@/lib/chain-matcher'
import type { ChainMatch } from '@/lib/chain-matcher'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recommendation {
  place: NearbyPlace
  explanation: string
  source: 'preference' | 'chain'
}

interface RecommendResponse {
  recommendations: Recommendation[]
  chainMatches: ChainMatch[]
  cached: boolean
}

interface GooglePlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  currentOpeningHours?: { openNow?: boolean }
  nationalPhoneNumber?: string
  photos?: Array<{ name: string }>
  primaryType?: string
  priceLevel?: string
}

interface PreferenceRow {
  category: string
  score: number
  sample_count: number
}

interface MemoryNodeRow {
  id: string
  type: string
  content: string
  city: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface GeminiRankedPlace {
  placeId: string
  explanation: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'places.nationalPhoneNumber',
  'places.photos',
  'places.primaryType',
  'places.priceLevel',
].join(',')

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: RecommendResponse; expires: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCacheKey(userId: string, lat: number, lng: number): string {
  // Round to ~500m grid for cache key
  const latGrid = Math.round(lat * 200) / 200
  const lngGrid = Math.round(lng * 200) / 200
  return `${userId}:${latGrid}:${lngGrid}`
}

function getFromCache(key: string): RecommendResponse | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setInCache(key: string, data: RecommendResponse): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely convert an unknown value to Record<string, unknown> via runtime check.
 */
function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, unknown> = Object.create(null)
  for (const [k, v] of Object.entries(value)) {
    result[k] = v
  }
  return result
}

function buildPhotoUrl(photoName: string): string {
  return `/api/places/photo?ref=${encodeURIComponent(photoName)}&maxWidth=400`
}

function mapPlace(place: GooglePlace): NearbyPlace {
  const firstPhoto = place.photos?.[0]?.name ?? null

  return {
    id: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    isOpen: place.currentOpeningHours?.openNow ?? null,
    phone: place.nationalPhoneNumber ?? null,
    photoUrl: firstPhoto ? buildPhotoUrl(firstPhoto) : null,
    type: place.primaryType ?? '',
    priceLevel: place.priceLevel ?? null,
  }
}

/**
 * Safely extract a GooglePlace from an unknown object using runtime validation.
 */
function toGooglePlace(obj: object): GooglePlace {
  const record: Record<string, unknown> = Object.create(null)
  for (const [k, v] of Object.entries(obj)) {
    record[k] = v
  }

  const id = typeof record.id === 'string' ? record.id : ''

  let displayName: GooglePlace['displayName']
  if (typeof record.displayName === 'object' && record.displayName !== null) {
    const dn: Record<string, unknown> = Object.create(null)
    for (const [k, v] of Object.entries(record.displayName)) {
      dn[k] = v
    }
    displayName = {
      text: typeof dn.text === 'string' ? dn.text : '',
      languageCode: typeof dn.languageCode === 'string' ? dn.languageCode : undefined,
    }
  }

  let location: GooglePlace['location']
  if (typeof record.location === 'object' && record.location !== null) {
    const loc: Record<string, unknown> = Object.create(null)
    for (const [k, v] of Object.entries(record.location)) {
      loc[k] = v
    }
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      location = { latitude: loc.latitude, longitude: loc.longitude }
    }
  }

  let currentOpeningHours: GooglePlace['currentOpeningHours']
  if (typeof record.currentOpeningHours === 'object' && record.currentOpeningHours !== null) {
    const oh: Record<string, unknown> = Object.create(null)
    for (const [k, v] of Object.entries(record.currentOpeningHours)) {
      oh[k] = v
    }
    currentOpeningHours = {
      openNow: typeof oh.openNow === 'boolean' ? oh.openNow : undefined,
    }
  }

  let photos: GooglePlace['photos']
  if (Array.isArray(record.photos)) {
    photos = record.photos
      .filter((ph): ph is object => typeof ph === 'object' && ph !== null)
      .map((ph) => {
        const phRec: Record<string, unknown> = Object.create(null)
        for (const [k, v] of Object.entries(ph)) {
          phRec[k] = v
        }
        return { name: typeof phRec.name === 'string' ? phRec.name : '' }
      })
      .filter((ph) => ph.name.length > 0)
  }

  return {
    id,
    displayName,
    formattedAddress: typeof record.formattedAddress === 'string' ? record.formattedAddress : undefined,
    location,
    rating: typeof record.rating === 'number' ? record.rating : undefined,
    userRatingCount: typeof record.userRatingCount === 'number' ? record.userRatingCount : undefined,
    currentOpeningHours,
    nationalPhoneNumber: typeof record.nationalPhoneNumber === 'string' ? record.nationalPhoneNumber : undefined,
    photos,
    primaryType: typeof record.primaryType === 'string' ? record.primaryType : undefined,
    priceLevel: typeof record.priceLevel === 'string' ? record.priceLevel : undefined,
  }
}

/**
 * Map a preference category to a Google Places includedType value.
 * cuisine: categories map to "restaurant" (the API doesn't have per-cuisine types).
 * type: categories map directly if they're valid Google Place types.
 */
function categoryToPlaceType(category: string): string | null {
  if (category.startsWith('cuisine:')) {
    return 'restaurant'
  }
  if (category.startsWith('type:')) {
    return category.slice('type:'.length)
  }
  return null
}

/**
 * Fetch nearby places from Google Places API for a given type.
 */
async function fetchNearbyPlaces(
  serverKey: string,
  lat: number,
  lng: number,
  placeType: string
): Promise<NearbyPlace[]> {
  let response: Response
  try {
    response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': serverKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: [placeType],
        locationRestriction: {
          circle: {
            center: { latitude: Number(lat), longitude: Number(lng) },
            radius: 2000,
          },
        },
        maxResultCount: 10,
      }),
    })
  } catch (err) {
    console.error('[Recommend] Network error fetching places:', err)
    return []
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Recommend] Places API error:', response.status, errorText)
    return []
  }

  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null) return []

  const body: Record<string, unknown> = Object.create(null)
  for (const [k, v] of Object.entries(data)) {
    body[k] = v
  }
  const places = body.places
  if (!Array.isArray(places)) return []

  return places.map((p: unknown) => {
    if (typeof p !== 'object' || p === null) {
      return mapPlace({ id: '' })
    }
    return mapPlace(toGooglePlace(p))
  }).filter((p) => p.id.length > 0)
}

/**
 * Use Gemini to rank candidate places based on user preferences and memories.
 */
async function geminiRank(
  preferences: PreferenceRow[],
  recentMemories: MemoryNodeRow[],
  candidates: NearbyPlace[]
): Promise<GeminiRankedPlace[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey) {
    console.error('[Recommend] Missing NEXT_PUBLIC_GOOGLE_API_KEY for Gemini')
    return []
  }

  const prefText = preferences
    .map((p) => `  - ${p.category}: score=${p.score.toFixed(2)}, samples=${p.sample_count}`)
    .join('\n')

  const memText = recentMemories
    .map((m) => `  - [${m.type}] ${m.content}${m.city ? ` (${m.city})` : ''}`)
    .join('\n')

  const candidateText = candidates
    .map((c) => `  - id=${c.id}, name="${c.name}", type=${c.type}, rating=${c.rating ?? 'N/A'}, priceLevel=${c.priceLevel ?? 'N/A'}`)
    .join('\n')

  const prompt = `You are a travel recommendation assistant. Rank these candidate places for a traveler based on their preferences.

TRAVELER PREFERENCES:
${prefText}

RECENT MEMORIES:
${memText}

CANDIDATE PLACES:
${candidateText}

Return a JSON array of the top 5 places, each with:
- placeId: the Google Place ID
- explanation: one-line explanation like "Because you loved [place] in [city]"

Return ONLY valid JSON. No markdown, no code fences.`

  try {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    })

    if (!response.text) return []

    const parsed: unknown = JSON.parse(response.text)
    if (!Array.isArray(parsed)) return []

    const results: GeminiRankedPlace[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      const obj: Record<string, unknown> = Object.create(null)
      for (const [k, v] of Object.entries(item)) {
        obj[k] = v
      }
      if (typeof obj.placeId !== 'string' || typeof obj.explanation !== 'string') continue
      results.push({ placeId: obj.placeId, explanation: obj.explanation })
    }
    return results
  } catch (err) {
    console.error('[Recommend] Gemini ranking error:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  // ---- Auth (same pattern as /api/preferences/summary) ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!serverKey) {
    return NextResponse.json({ error: 'Google Maps API is not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component -- safe to ignore with middleware refreshing sessions.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ---- Parse query params ----
  const { searchParams } = request.nextUrl
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: 'Missing required query parameters: lat, lng' },
      { status: 400 }
    )
  }

  const lat = Number(latParam)
  const lng = Number(lngParam)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 }
    )
  }

  // ---- Check cache ----
  const cacheKey = getCacheKey(user.id, lat, lng)
  const cached = getFromCache(cacheKey)
  if (cached) {
    return NextResponse.json({ ...cached, cached: true })
  }

  // ---- Fetch user preferences (top 10 by score) ----
  const { data: prefData, error: prefError } = await supabase
    .from('user_preferences')
    .select('category, score, sample_count')
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(10)

  if (prefError) {
    console.error('[Recommend] Preferences query error:', prefError.message)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }

  const preferences: PreferenceRow[] = (prefData ?? []).map((row) => ({
    category: typeof row.category === 'string' ? row.category : '',
    score: typeof row.score === 'number' ? row.score : 0,
    sample_count: typeof row.sample_count === 'number' ? row.sample_count : 0,
  }))

  // ---- Count total memory_nodes to determine cold start tier ----
  const { count: memoryCount, error: countError } = await supabase
    .from('memory_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) {
    console.error('[Recommend] Memory count error:', countError.message)
    return NextResponse.json({ error: 'Failed to count memories' }, { status: 500 })
  }

  const totalMemories = memoryCount ?? 0

  // ---- Cold start: 0-2 memories -> empty recommendations ----
  if (totalMemories <= 2) {
    const result: RecommendResponse = { recommendations: [], chainMatches: [], cached: false }
    setInCache(cacheKey, result)
    return NextResponse.json(result)
  }

  // ---- Determine top 3 cuisine/type preferences for Places queries ----
  const placeTypes = new Set<string>()

  for (const pref of preferences) {
    if (placeTypes.size >= 3) break
    const placeType = categoryToPlaceType(pref.category)
    if (placeType && !placeTypes.has(placeType)) {
      placeTypes.add(placeType)
    }
  }

  // ---- Fetch nearby places for each top preference type ----
  const allNearbyPlaces: NearbyPlace[] = []
  const placeTypeArray = Array.from(placeTypes)

  const placeResults = await Promise.allSettled(
    placeTypeArray.map((type) => fetchNearbyPlaces(serverKey, lat, lng, type))
  )

  for (const result of placeResults) {
    if (result.status === 'fulfilled') {
      allNearbyPlaces.push(...result.value)
    }
  }

  // ---- Deduplicate by place ID ----
  const seenPlaceIds = new Map<string, NearbyPlace>()
  for (const place of allNearbyPlaces) {
    if (!seenPlaceIds.has(place.id)) {
      seenPlaceIds.set(place.id, place)
    }
  }

  // ---- Fetch saved places (for dedup + chain matching) ----
  const { data: savedPlaceRows, error: savedError } = await supabase
    .from('memory_nodes')
    .select('content, city, metadata')
    .eq('user_id', user.id)
    .eq('type', 'place')

  if (savedError) {
    console.error('[Recommend] Saved places query error:', savedError.message)
    // Continue with unfiltered candidates rather than failing
  }

  const savedPlaceIds = new Set<string>()
  const savedPlacesForChainMatch: Array<{ name: string; city: string | null }> = []
  if (savedPlaceRows) {
    for (const row of savedPlaceRows) {
      const metadata = row.metadata
      if (typeof metadata === 'object' && metadata !== null) {
        const meta: Record<string, unknown> = Object.create(null)
        for (const [k, v] of Object.entries(metadata)) {
          meta[k] = v
        }
        const placeId = meta.place_id ?? meta.placeId ?? meta.google_place_id
        if (typeof placeId === 'string' && placeId.length > 0) {
          savedPlaceIds.add(placeId)
        }
        // Extract name for chain matching
        const placeName = meta.name ?? meta.place_name
        if (typeof placeName === 'string' && placeName.length > 0) {
          savedPlacesForChainMatch.push({
            name: placeName,
            city: typeof row.city === 'string' ? row.city : null,
          })
        }
      }
      // Fallback: use content field as place name if metadata lacks a name
      if (savedPlacesForChainMatch.length === 0 || savedPlacesForChainMatch[savedPlacesForChainMatch.length - 1].name !== row.content) {
        if (typeof row.content === 'string' && row.content.length > 0) {
          const alreadyAdded = savedPlacesForChainMatch.some((p) => p.name === row.content)
          if (!alreadyAdded) {
            savedPlacesForChainMatch.push({
              name: row.content,
              city: typeof row.city === 'string' ? row.city : null,
            })
          }
        }
      }
    }
  }

  const candidates: NearbyPlace[] = []
  seenPlaceIds.forEach((place, placeId) => {
    if (candidates.length >= 15) return
    if (savedPlaceIds.has(placeId)) return
    candidates.push(place)
  })

  // ---- Chain matching (runs for all tiers, even with 0 candidates) ----
  const allFetchedPlaces = Array.from(seenPlaceIds.values())
  const chainMatchResults = findChainMatches(savedPlacesForChainMatch, allFetchedPlaces)

  if (candidates.length === 0) {
    const result: RecommendResponse = { recommendations: [], chainMatches: chainMatchResults, cached: false }
    setInCache(cacheKey, result)
    return NextResponse.json(result)
  }

  // ---- 3-5 memories: rule-based only (no Gemini call) ----
  if (totalMemories < 6) {
    const recommendations = buildRuleBasedRecommendations(candidates, preferences)
    const result: RecommendResponse = { recommendations, chainMatches: chainMatchResults, cached: false }
    setInCache(cacheKey, result)
    return NextResponse.json(result)
  }

  // ---- 6+ memories: full hybrid with Gemini ranking ----
  const { data: recentMemoryRows, error: memoryError } = await supabase
    .from('memory_nodes')
    .select('id, type, content, city, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (memoryError) {
    console.error('[Recommend] Recent memories query error:', memoryError.message)
    // Fall back to rule-based
    const recommendations = buildRuleBasedRecommendations(candidates, preferences)
    const result: RecommendResponse = { recommendations, chainMatches: chainMatchResults, cached: false }
    setInCache(cacheKey, result)
    return NextResponse.json(result)
  }

  const recentMemories: MemoryNodeRow[] = (recentMemoryRows ?? []).map((row) => ({
    id: typeof row.id === 'string' ? row.id : '',
    type: typeof row.type === 'string' ? row.type : '',
    content: typeof row.content === 'string' ? row.content : '',
    city: typeof row.city === 'string' ? row.city : null,
    metadata: toRecord(row.metadata),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
  }))

  const geminiResults = await geminiRank(preferences, recentMemories, candidates)

  if (geminiResults.length === 0) {
    // Gemini failed or returned nothing -- fall back to rule-based
    const recommendations = buildRuleBasedRecommendations(candidates, preferences)
    const result: RecommendResponse = { recommendations, chainMatches: chainMatchResults, cached: false }
    setInCache(cacheKey, result)
    return NextResponse.json(result)
  }

  // Build recommendations from Gemini ranking
  const candidateMap = new Map(candidates.map((c) => [c.id, c]))
  const recommendations: Recommendation[] = []

  for (const ranked of geminiResults) {
    const place = candidateMap.get(ranked.placeId)
    if (!place) continue
    recommendations.push({
      place,
      explanation: ranked.explanation,
      source: 'preference',
    })
    if (recommendations.length >= 5) break
  }

  // If Gemini ranked fewer than 5, backfill with rule-based
  if (recommendations.length < 5) {
    const rankedIds = new Set(recommendations.map((r) => r.place.id))
    const remaining = candidates.filter((c) => !rankedIds.has(c.id))
    const backfill = buildRuleBasedRecommendations(remaining, preferences)
    for (const rec of backfill) {
      if (recommendations.length >= 5) break
      recommendations.push(rec)
    }
  }

  const result: RecommendResponse = { recommendations, chainMatches: chainMatchResults, cached: false }
  setInCache(cacheKey, result)
  return NextResponse.json(result)
}

// ---------------------------------------------------------------------------
// Rule-based recommendation builder
// ---------------------------------------------------------------------------

/**
 * Build recommendations using simple heuristic ranking:
 * - Score each candidate by matching its type to user preferences
 * - Sort by combined score (preference match + rating)
 * - Return top 5
 */
function buildRuleBasedRecommendations(
  candidates: NearbyPlace[],
  preferences: PreferenceRow[]
): Recommendation[] {
  // Build a lookup from place type -> best matching preference score
  const prefScoreByType = new Map<string, number>()
  for (const pref of preferences) {
    const placeType = categoryToPlaceType(pref.category)
    if (placeType) {
      const existing = prefScoreByType.get(placeType)
      if (existing === undefined || pref.score > existing) {
        prefScoreByType.set(placeType, pref.score)
      }
    }
  }

  // Also build a cuisine preference lookup for explanation text
  const topCuisine = preferences.find((p) => p.category.startsWith('cuisine:'))
  const cuisineLabel = topCuisine ? topCuisine.category.slice('cuisine:'.length) : null

  const scored = candidates.map((place) => {
    const prefScore = prefScoreByType.get(place.type) ?? 0
    const ratingScore = (place.rating ?? 0) / 5
    return { place, score: prefScore * 0.7 + ratingScore * 0.3 }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 5).map(({ place }) => {
    let explanation = 'Highly rated nearby'
    if (cuisineLabel) {
      explanation = `Matches your preference for ${cuisineLabel} cuisine`
    } else if (place.type) {
      explanation = `Popular ${place.type.replace(/_/g, ' ')} nearby`
    }
    return {
      place,
      explanation,
      source: 'preference' as const,
    }
  })
}
