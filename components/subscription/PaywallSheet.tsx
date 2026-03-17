'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Check } from 'lucide-react'

interface PaywallSheetProps {
  isOpen: boolean
  onClose: () => void
  feature: string
}

const FREE_FEATURES = [
  'Voice translation (basic)',
  'Camera translate',
  'Dish & price scanner',
  '50 memory nodes',
]

const PAID_FEATURES = [
  'Everything in Free',
  'Unlimited memory nodes',
  'Photo memories with cloud sync',
  'AI travel recommendations',
  'Priority voice quality',
  'Offline phrase packs',
]

export function PaywallSheet({ isOpen, onClose, feature }: PaywallSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const handleUpgrade = useCallback(async () => {
    setUpgradeLoading(true)
    setUpgradeError(null)

    try {
      const res = await fetch('/api/subscription/checkout', { method: 'POST' })
      const body = await res.json()

      if (!res.ok) {
        setUpgradeError(body.message ?? body.error ?? 'Something went wrong')
        return
      }

      if (body.url) {
        window.location.href = body.url
        return
      }

      setUpgradeError('No checkout URL returned')
    } catch {
      setUpgradeError('Network error. Please try again.')
    } finally {
      setUpgradeLoading(false)
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative w-full max-w-lg bg-background rounded-t-2xl animate-in slide-in-from-bottom duration-300 ease-out max-h-[85vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-8 pt-2">
          {/* Header */}
          <h2 id="paywall-title" className="text-xl font-bold text-foreground">
            Unlock {feature}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Found in Translation Pro for the full experience.
          </p>

          {/* Comparison */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {/* Free column */}
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Free</p>
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Paid column */}
            <div className="rounded-xl border-2 border-primary p-4 bg-primary/5">
              <p className="text-sm font-semibold text-primary mb-3">Pro</p>
              <ul className="space-y-2">
                {PAID_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA buttons */}
          <button
            onClick={handleUpgrade}
            disabled={upgradeLoading}
            className="mt-6 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {upgradeLoading ? 'Loading...' : 'Upgrade to Pro'}
          </button>
          {upgradeError && (
            <p className="mt-2 text-xs text-destructive text-center" role="alert">
              {upgradeError}
            </p>
          )}
          <button
            onClick={onClose}
            className="mt-2 w-full h-10 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
