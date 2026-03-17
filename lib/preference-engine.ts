import { createClient } from '@/lib/supabase'
import type { MemoryNodeType } from '@/types/database'

export interface PreferenceSignal {
  category: string // e.g. 'cuisine:japanese', 'type:izakaya', 'chain:% Arabica'
  value: number // signal strength 0-1
}

/**
 * Normalize a category value: lowercase, trimmed, with empty strings filtered out.
 */
function normalize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.toLowerCase().trim()
}

/**
 * Safely read a number from metadata, returning null if not a finite number.
 */
function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

/**
 * Safely read a string from metadata, returning null if not a string.
 */
function readString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return null
}

/**
 * Safely read a string array from metadata, filtering out non-string elements.
 */
function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Map price level strings like '$', '$$', '$$$' to normalized labels.
 */
function normalizePriceLevel(value: unknown): string | null {
  const str = readString(value)
  if (!str) return null
  const dollarCount = (str.match(/\$/g) ?? []).length
  if (dollarCount === 1) return 'budget'
  if (dollarCount === 2) return 'moderate'
  if (dollarCount >= 3) return 'luxury'
  // Handle text labels, normalizing aliases to canonical values
  const lower = str.toLowerCase().trim()
  if (['budget', 'moderate', 'luxury'].includes(lower)) return lower
  if (lower === 'cheap') return 'budget'
  if (lower === 'expensive') return 'luxury'
  return null
}

/**
 * Extract preference signals from a memory node's metadata.
 *
 * Signal values per PRD:
 * - explicit 5-star rating = rating/5
 * - saved place = 0.7
 * - dish scan = 0.5
 * - revisit (same place saved again) = 1.0
 */
export function extractSignals(
  type: MemoryNodeType,
  content: string,
  metadata: Record<string, unknown>
): PreferenceSignal[] {
  if (type === 'phrase' || type === 'event') return []

  if (type === 'place') return extractPlaceSignals(metadata)
  if (type === 'dish') return extractDishSignals(metadata)
  if (type === 'preference') return extractPreferenceSignals(metadata)
  if (type === 'expense') return extractExpenseSignals(metadata)

  return []
}

/**
 * Extract signals from a saved place.
 * Base value 0.7, optionally multiplied by rating/5.
 */
function extractPlaceSignals(metadata: Record<string, unknown>): PreferenceSignal[] {
  const signals: PreferenceSignal[] = []
  const rating = readNumber(metadata.rating)
  const ratingMultiplier = rating !== null ? Math.min(Math.max(rating, 0), 5) / 5 : 1

  const cuisineType = normalize(metadata.cuisine_type)
  if (cuisineType) {
    signals.push({ category: `cuisine:${cuisineType}`, value: 0.7 * ratingMultiplier })
  }

  const categories = readStringArray(metadata.place_categories)
  for (const cat of categories) {
    const normalized = normalize(cat)
    if (normalized) {
      signals.push({ category: `type:${normalized}`, value: 0.7 * ratingMultiplier })
    }
  }

  const priceLevel = normalizePriceLevel(metadata.price_level)
  if (priceLevel) {
    signals.push({ category: `price:${priceLevel}`, value: 0.7 * ratingMultiplier })
  }

  return signals
}

/**
 * Extract signals from a dish scan.
 * Base value 0.5.
 */
function extractDishSignals(metadata: Record<string, unknown>): PreferenceSignal[] {
  const signals: PreferenceSignal[] = []

  const cuisineType = normalize(metadata.cuisine_type ?? metadata.cuisineType)
  if (cuisineType) {
    signals.push({ category: `cuisine:${cuisineType}`, value: 0.5 })
  }

  const dishName = readString(metadata.dishName ?? metadata.dish_name)
  if (dishName) {
    const normalized = normalize(dishName)
    if (normalized) {
      signals.push({ category: `dish:${normalized}`, value: 0.5 })
    }
  }

  return signals
}

/**
 * Extract signals from an explicit preference/rating.
 * Base value 0.7, multiplied by rating/5 if rating exists.
 */
function extractPreferenceSignals(metadata: Record<string, unknown>): PreferenceSignal[] {
  const signals: PreferenceSignal[] = []
  const rating = readNumber(metadata.rating)
  const ratingMultiplier = rating !== null ? Math.min(Math.max(rating, 0), 5) / 5 : 1
  const baseValue = 0.7 * ratingMultiplier

  const cuisineType = normalize(metadata.cuisine_type)
  if (cuisineType) {
    signals.push({ category: `cuisine:${cuisineType}`, value: baseValue })
  }

  const categories = readStringArray(metadata.place_categories)
  for (const cat of categories) {
    const normalized = normalize(cat)
    if (normalized) {
      signals.push({ category: `type:${normalized}`, value: baseValue })
    }
  }

  const priceLevel = normalizePriceLevel(metadata.price_level)
  if (priceLevel) {
    signals.push({ category: `price:${priceLevel}`, value: baseValue })
  }

  return signals
}

/**
 * Extract signals from an expense.
 * Only extracts chain signals from store name.
 */
function extractExpenseSignals(metadata: Record<string, unknown>): PreferenceSignal[] {
  const storeName = readString(metadata.storeName ?? metadata.store_name)
  if (!storeName) return []

  const normalized = normalize(storeName)
  if (!normalized) return []

  return [{ category: `chain:${normalized}`, value: 0.5 }]
}

/**
 * Upsert preference scores using cumulative moving average:
 * new_score = (old_score * sample_count + signal_value) / (sample_count + 1)
 *
 * Uses batched queries (1 SELECT + 1 UPSERT) instead of per-signal queries.
 *
 * Categories are hierarchical tags:
 * - cuisine:japanese
 * - type:izakaya
 * - price:moderate
 * - dish:ramen
 * - chain:% Arabica
 */
export async function updatePreferences(
  userId: string,
  signals: PreferenceSignal[]
): Promise<void> {
  if (signals.length === 0) return

  const supabase = createClient()

  // Aggregate duplicate categories before upserting
  const grouped = new Map<string, { totalValue: number; count: number }>()
  for (const signal of signals) {
    const existing = grouped.get(signal.category)
    if (existing) {
      existing.totalValue += signal.value
      existing.count += 1
    } else {
      grouped.set(signal.category, { totalValue: signal.value, count: 1 })
    }
  }

  // Batch fetch all existing preferences in one query
  const categories = Array.from(grouped.keys())
  const { data: existingRows, error: selectError } = await supabase
    .from('user_preferences')
    .select('category, score, sample_count')
    .eq('user_id', userId)
    .in('category', categories)

  if (selectError) {
    throw new Error(`Preference select failed: ${selectError.message}`)
  }

  const existingMap = new Map(
    (existingRows ?? []).map((r) => [r.category, r])
  )

  // Build upsert rows with computed scores
  const rows = categories.map((category) => {
    const group = grouped.get(category)
    if (!group) {
      return { user_id: userId, category, score: 0, sample_count: 0 }
    }
    const existing = existingMap.get(category)
    if (existing) {
      const oldScore = typeof existing.score === 'number' ? existing.score : 0
      let sampleCount = typeof existing.sample_count === 'number' ? existing.sample_count : 0
      // Apply each signal in the group sequentially via CMA
      const avgValue = group.totalValue / group.count
      let score = oldScore
      for (let i = 0; i < group.count; i++) {
        score = (score * sampleCount + avgValue) / (sampleCount + 1)
        sampleCount += 1
      }
      return { user_id: userId, category, score, sample_count: sampleCount }
    }
    return {
      user_id: userId,
      category,
      score: group.totalValue / group.count,
      sample_count: group.count,
    }
  })

  const { error: upsertError } = await supabase
    .from('user_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (upsertError) {
    throw new Error(`Preference upsert failed: ${upsertError.message}`)
  }
}
