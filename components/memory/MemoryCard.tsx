'use client'

import { useState, useEffect } from 'react'
import type { MemoryNodeType } from '@/types/database'

interface MemoryCardMemory {
  id: string
  type: string
  content: string
  city: string | null
  photo_path: string | null
  created_at: string
  metadata: Record<string, unknown>
}

export interface MemoryCardProps {
  memory: MemoryCardMemory
  onDelete?: (id: string) => void
  onTap?: (memory: MemoryCardMemory) => void
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  dish: { emoji: '\u{1F374}', color: '#e85d4a', label: 'Dish' },
  expense: { emoji: '\u{1F4B0}', color: '#48bb78', label: 'Expense' },
  phrase: { emoji: '\u{1F4AC}', color: '#4A90D9', label: 'Phrase' },
  place: { emoji: '\u{1F4CD}', color: '#f5c842', label: 'Place' },
  event: { emoji: '\u{1F4DE}', color: '#9f7aea', label: 'Event' },
}

function getTypeConfig(type: string): { emoji: string; color: string; label: string } {
  return TYPE_CONFIG[type] ?? { emoji: '\u{2753}', color: '#666', label: 'Memory' }
}

function getRelativeDate(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  const years = Math.floor(diffDays / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

function deriveTitle(content: string): string {
  if (content.length <= 60) return content
  return content.slice(0, 57) + '...'
}

export function MemoryCard({ memory, onDelete, onTap }: MemoryCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const config = getTypeConfig(memory.type)
  const relativeDate = getRelativeDate(memory.created_at)
  const title = deriveTitle(memory.content)

  useEffect(() => {
    if (!memory.photo_path) return

    let cancelled = false
    setPhotoLoading(true)

    fetch(`/api/memories/photo/${memory.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Photo fetch failed')
        return res.json()
      })
      .then((data: { url: string }) => {
        if (!cancelled) setPhotoUrl(data.url)
      })
      .catch(() => {
        // Silently fail -- show placeholder instead
      })
      .finally(() => {
        if (!cancelled) setPhotoLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [memory.id, memory.photo_path])

  return (
    <div
      data-testid="memory-card"
      role="button"
      tabIndex={0}
      onClick={() => onTap?.(memory)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap?.(memory)
        }
      }}
      className="relative rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
      style={{
        backgroundColor: '#1a2744',
        border: `1px solid ${config.color}33`,
      }}
    >
      {/* Photo / Placeholder */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden bg-black/20">
        {memory.photo_path && photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            data-testid="memory-photo-placeholder"
            className="flex items-center justify-center w-full h-full"
            style={{ backgroundColor: `${config.color}22` }}
          >
            <span className="text-4xl" role="img" aria-label={config.label}>
              {config.emoji}
            </span>
          </div>
        )}

        {/* Type badge */}
        <div
          data-testid="memory-type-badge"
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-md"
          style={{ backgroundColor: `${config.color}cc` }}
        >
          {config.emoji} {config.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <p data-testid="memory-title" className="text-sm font-semibold text-white truncate">
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span data-testid="memory-date" className="text-xs text-white/50">
            {relativeDate}
          </span>
          {memory.city && (
            <>
              <span className="text-white/20">|</span>
              <span data-testid="memory-city" className="text-xs text-white/50 truncate">
                {memory.city}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          aria-label="Delete memory"
          data-testid="memory-delete-btn"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-red-500/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(memory.id)
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}
