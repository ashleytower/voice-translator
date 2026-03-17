import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SubscriptionBadge } from '../SubscriptionBadge'

describe('SubscriptionBadge', () => {
  it('shows "Free" text for free tier', () => {
    render(<SubscriptionBadge tier="free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('shows "Pro" text for paid tier', () => {
    render(<SubscriptionBadge tier="paid" />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('applies muted styling for free tier', () => {
    render(<SubscriptionBadge tier="free" />)
    const badge = screen.getByTestId('subscription-badge')
    expect(badge.className).toContain('bg-muted')
    expect(badge.className).toContain('text-muted-foreground')
  })

  it('applies amber/gold styling for paid tier', () => {
    render(<SubscriptionBadge tier="paid" />)
    const badge = screen.getByTestId('subscription-badge')
    expect(badge.className).toContain('bg-amber-100')
    expect(badge.className).toContain('text-amber-800')
  })

  it('renders star icon for paid tier', () => {
    const { container } = render(<SubscriptionBadge tier="paid" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('does not render star icon for free tier', () => {
    const { container } = render(<SubscriptionBadge tier="free" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeNull()
  })

  it('applies sm size styles by default', () => {
    render(<SubscriptionBadge tier="free" />)
    const badge = screen.getByTestId('subscription-badge')
    expect(badge.className).toContain('px-1.5')
    expect(badge.className).toContain('text-[10px]')
  })

  it('applies md size styles when size="md"', () => {
    render(<SubscriptionBadge tier="free" size="md" />)
    const badge = screen.getByTestId('subscription-badge')
    expect(badge.className).toContain('px-2.5')
    expect(badge.className).toContain('text-xs')
  })
})
