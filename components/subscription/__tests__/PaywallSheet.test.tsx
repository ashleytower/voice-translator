import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PaywallSheet } from '../PaywallSheet'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  feature: 'Photo Memories',
}

describe('PaywallSheet', () => {
  it('renders when isOpen=true', () => {
    render(<PaywallSheet {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when isOpen=false', () => {
    const { container } = render(
      <PaywallSheet {...defaultProps} isOpen={false} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    render(<PaywallSheet {...defaultProps} onClose={onClose} />)
    // The backdrop is the first child with the bg-black class
    const backdrop = document.querySelector('.bg-black\\/60')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(<PaywallSheet {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows "Upgrade to Pro" button', () => {
    render(<PaywallSheet {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: /upgrade to pro/i }),
    ).toBeInTheDocument()
  })

  it('shows free tier features', () => {
    render(<PaywallSheet {...defaultProps} />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Voice translation (basic)')).toBeInTheDocument()
    expect(screen.getByText('50 memory nodes')).toBeInTheDocument()
  })

  it('shows pro tier features', () => {
    render(<PaywallSheet {...defaultProps} />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Unlimited memory nodes')).toBeInTheDocument()
    expect(screen.getByText('AI travel recommendations')).toBeInTheDocument()
  })

  it('displays the feature name in the header', () => {
    render(<PaywallSheet {...defaultProps} feature="Offline Packs" />)
    expect(screen.getByText('Unlock Offline Packs')).toBeInTheDocument()
  })

  it('shows "Maybe later" dismiss button', () => {
    render(<PaywallSheet {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: /maybe later/i }),
    ).toBeInTheDocument()
  })

  it('calls onClose when "Maybe later" is clicked', () => {
    const onClose = vi.fn()
    render(<PaywallSheet {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /maybe later/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
