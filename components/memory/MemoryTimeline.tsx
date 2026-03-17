'use client'

import { useState, useEffect, useCallback } from 'react'
import { MemoryCard } from './MemoryCard'
import type { MemoryNode } from '@/types/database'

interface CityGroup {
  city: string
  count: number
}

interface TimelineData {
  memories: MemoryNode[]
  groups: CityGroup[]
  page: number
  hasMore: boolean
}

export interface MemoryTimelineProps {
  onBack: () => void
}

export function MemoryTimeline({ onBack }: MemoryTimelineProps) {
  const [memories, setMemories] = useState<MemoryNode[]>([])
  const [groups, setGroups] = useState<CityGroup[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await fetch(`/api/memories/timeline?page=${pageNum}&limit=20`)
      if (!res.ok) {
        throw new Error('Failed to fetch timeline')
      }
      const data: TimelineData = await res.json()

      if (append) {
        setMemories((prev) => [...prev, ...data.memories])
      } else {
        setMemories(data.memories)
      }
      setGroups(data.groups)
      setPage(data.page)
      setHasMore(data.hasMore)
    } catch {
      setError('Failed to load memories. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchTimeline(1, false)
  }, [fetchTimeline])

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return
    fetchTimeline(page + 1, true)
  }

  const handleDelete = async (id: string) => {
    // Optimistically remove from the list
    setMemories((prev) => prev.filter((m) => m.id !== id))

    try {
      const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Revert on failure -- refetch
        fetchTimeline(1, false)
      }
    } catch {
      fetchTimeline(1, false)
    }
  }

  // Group memories by city for display
  const memoriesByCity = new Map<string, MemoryNode[]>()
  for (const memory of memories) {
    const cityKey = memory.city ?? 'Unknown'
    const list = memoriesByCity.get(cityKey)
    if (list) {
      list.push(memory)
    } else {
      memoriesByCity.set(cityKey, [memory])
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0e1626]">
      {/* Loading state */}
      {loading && (
        <div className="px-4 pt-4 pb-6" data-testid="timeline-loading">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                data-testid="skeleton-card"
                className="aspect-[4/3] rounded-2xl bg-white/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <p className="text-sm text-red-400 text-center">{error}</p>
          <button
            onClick={() => fetchTimeline(1, false)}
            className="px-4 py-2 rounded-full bg-white/10 text-sm text-white hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && memories.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4" data-testid="timeline-empty">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
            {'\u{1F4F8}'}
          </div>
          <p className="text-base font-semibold text-white text-center">No memories yet</p>
          <p className="text-sm text-white/50 text-center leading-relaxed">
            Start exploring to build your travel timeline.
          </p>
        </div>
      )}

      {/* Memory timeline grouped by city */}
      {!loading && !error && memories.length > 0 && (
        <div className="px-4 pt-4 pb-6 overflow-y-auto">
          {Array.from(memoriesByCity.entries()).map(([city, cityMemories]) => (
            <div key={city} className="mb-6">
              {/* City header */}
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[15px] font-bold text-white">
                  {'\u{1F4CD}'} {city}
                </h3>
                <span className="text-xs text-white/50">
                  {cityMemories.length} {cityMemories.length === 1 ? 'memory' : 'memories'}
                </span>
              </div>
              <div className="w-full h-px bg-white/10 mb-3" />

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-3">
                {cityMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mt-4 mb-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
