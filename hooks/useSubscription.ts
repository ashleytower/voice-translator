'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import { getUserTier } from '@/lib/subscription'
import type { SubscriptionTier } from '@/types/database'

export function useSubscription() {
  const { user } = useSession()
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [isLoading, setIsLoading] = useState(true)
  const cachedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTier('free')
      setIsLoading(false)
      cachedRef.current = null
      return
    }

    // Skip fetch if we already loaded for this user
    if (cachedRef.current === user.id) return

    let cancelled = false

    getUserTier(user.id)
      .then((result) => {
        if (cancelled) return
        setTier(result)
        setIsLoading(false)
        cachedRef.current = user.id
      })
      .catch(() => {
        if (cancelled) return
        setTier('free')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return {
    tier,
    isPaid: tier === 'paid',
    isLoading,
  }
}
