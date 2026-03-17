import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryCard } from '../MemoryCard'

// Mock fetch for photo URL loading
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

const baseMemory = {
  id: 'mem-1',
  type: 'dish',
  content: 'Incredible tonkotsu ramen at Ichiran',
  city: 'Tokyo',
  photo_path: null,
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  metadata: {},
}

describe('MemoryCard', () => {
  it('renders memory content text', () => {
    render(<MemoryCard memory={baseMemory} />)
    expect(screen.getByTestId('memory-title')).toHaveTextContent('Incredible tonkotsu ramen at Ichiran')
  })

  it('shows type icon based on memory type - dish', () => {
    render(<MemoryCard memory={baseMemory} />)
    const badge = screen.getByTestId('memory-type-badge')
    expect(badge).toHaveTextContent('Dish')
  })

  it('shows type icon based on memory type - expense', () => {
    const expenseMemory = { ...baseMemory, id: 'mem-2', type: 'expense' }
    render(<MemoryCard memory={expenseMemory} />)
    const badge = screen.getByTestId('memory-type-badge')
    expect(badge).toHaveTextContent('Expense')
  })

  it('shows type icon based on memory type - phrase', () => {
    const phraseMemory = { ...baseMemory, id: 'mem-3', type: 'phrase' }
    render(<MemoryCard memory={phraseMemory} />)
    const badge = screen.getByTestId('memory-type-badge')
    expect(badge).toHaveTextContent('Phrase')
  })

  it('shows type icon based on memory type - place', () => {
    const placeMemory = { ...baseMemory, id: 'mem-4', type: 'place' }
    render(<MemoryCard memory={placeMemory} />)
    const badge = screen.getByTestId('memory-type-badge')
    expect(badge).toHaveTextContent('Place')
  })

  it('shows type icon based on memory type - event', () => {
    const eventMemory = { ...baseMemory, id: 'mem-5', type: 'event' }
    render(<MemoryCard memory={eventMemory} />)
    const badge = screen.getByTestId('memory-type-badge')
    expect(badge).toHaveTextContent('Event')
  })

  it('shows relative date', () => {
    render(<MemoryCard memory={baseMemory} />)
    const dateEl = screen.getByTestId('memory-date')
    expect(dateEl).toHaveTextContent('2 days ago')
  })

  it('shows city name when provided', () => {
    render(<MemoryCard memory={baseMemory} />)
    const cityEl = screen.getByTestId('memory-city')
    expect(cityEl).toHaveTextContent('Tokyo')
  })

  it('does not show city when city is null', () => {
    const noCityMemory = { ...baseMemory, city: null }
    render(<MemoryCard memory={noCityMemory} />)
    expect(screen.queryByTestId('memory-city')).not.toBeInTheDocument()
  })

  it('calls onTap when clicked', () => {
    const handleTap = vi.fn()
    render(<MemoryCard memory={baseMemory} onTap={handleTap} />)
    fireEvent.click(screen.getByTestId('memory-card'))
    expect(handleTap).toHaveBeenCalledTimes(1)
    expect(handleTap).toHaveBeenCalledWith(baseMemory)
  })

  it('calls onTap on Enter key press', () => {
    const handleTap = vi.fn()
    render(<MemoryCard memory={baseMemory} onTap={handleTap} />)
    fireEvent.keyDown(screen.getByTestId('memory-card'), { key: 'Enter' })
    expect(handleTap).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete is triggered', () => {
    const handleDelete = vi.fn()
    render(<MemoryCard memory={baseMemory} onDelete={handleDelete} />)
    const deleteBtn = screen.getByTestId('memory-delete-btn')
    fireEvent.click(deleteBtn)
    expect(handleDelete).toHaveBeenCalledTimes(1)
    expect(handleDelete).toHaveBeenCalledWith('mem-1')
  })

  it('does not show delete button when onDelete is not provided', () => {
    render(<MemoryCard memory={baseMemory} />)
    expect(screen.queryByTestId('memory-delete-btn')).not.toBeInTheDocument()
  })

  it('shows photo placeholder when no photo_path', () => {
    render(<MemoryCard memory={baseMemory} />)
    const placeholder = screen.getByTestId('memory-photo-placeholder')
    expect(placeholder).toBeInTheDocument()
  })

  it('does not call onTap when delete button is clicked (stopPropagation)', () => {
    const handleTap = vi.fn()
    const handleDelete = vi.fn()
    render(<MemoryCard memory={baseMemory} onTap={handleTap} onDelete={handleDelete} />)
    const deleteBtn = screen.getByTestId('memory-delete-btn')
    fireEvent.click(deleteBtn)
    expect(handleDelete).toHaveBeenCalledTimes(1)
    expect(handleTap).not.toHaveBeenCalled()
  })

  it('truncates long content to title', () => {
    const longMemory = {
      ...baseMemory,
      content: 'This is a very long memory content that exceeds sixty characters and should be truncated with ellipsis',
    }
    render(<MemoryCard memory={longMemory} />)
    const title = screen.getByTestId('memory-title')
    expect(title.textContent).toContain('...')
    expect(title.textContent?.length).toBeLessThanOrEqual(60)
  })

  it('fetches signed URL when photo_path exists', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://signed-url.example.com/photo.jpg' }),
    })

    const photoMemory = { ...baseMemory, photo_path: 'photos/test.jpg' }
    render(<MemoryCard memory={photoMemory} />)

    expect(mockFetch).toHaveBeenCalledWith('/api/memories/photo/mem-1')
  })

  it('shows relative date for recent memories', () => {
    const recentMemory = {
      ...baseMemory,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    }
    render(<MemoryCard memory={recentMemory} />)
    const dateEl = screen.getByTestId('memory-date')
    expect(dateEl).toHaveTextContent('30m ago')
  })
})
