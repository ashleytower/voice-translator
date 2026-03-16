'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { TravelerProfile } from '@/types/database'
import { saveMemory } from '@/lib/memory'
import type { NearbyPlace, Message } from '@/types'

const SAVED_PLACES_KEY = 'fit-saved-places'
const MESSAGES_KEY = 'fluent-messages'

/**
 * One-time migration: push existing localStorage saved places and favorited
 * messages to Supabase memory_nodes so they persist across devices.
 * Runs in background -- does not block the UI.
 */
async function migrateLocalStorage(): Promise<void> {
  // Migrate saved places
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY)
    if (raw) {
      const places: NearbyPlace[] = JSON.parse(raw)
      for (const place of places) {
        await saveMemory('place', `Saved ${place.name} at ${place.address}`, {
          place_id: place.id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
        })
      }
    }
  } catch {
    // Non-critical -- localStorage may be empty or corrupt
  }

  // Migrate favorited messages
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    if (raw) {
      const messages: Message[] = JSON.parse(raw)
      const favorites = messages.filter((m) => m.isFavorite)
      for (const fav of favorites) {
        await saveMemory('phrase', fav.translation || fav.text, {
          source: 'migration',
          originalText: fav.text,
        })
      }
    }
  } catch {
    // Non-critical
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<TravelerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const migrationFiredRef = useRef(false)

  const isOnboarded = profile !== null && profile.onboarded_at !== null

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('traveler_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    setProfile(data ?? null)
    return data ?? null
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Use getUser() for secure server-validated check, then getSession() for session object
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(user)
        const profileData = await fetchProfile(user.id)

        // First sign-in: authenticated but no profile yet -- migrate localStorage
        if (!profileData && !migrationFiredRef.current) {
          migrationFiredRef.current = true
          migrateLocalStorage() // fire-and-forget
        }
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id)

        // First sign-in: authenticated but no profile yet -- migrate localStorage
        if (!profileData && !migrationFiredRef.current) {
          migrationFiredRef.current = true
          migrateLocalStorage() // fire-and-forget
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signInWithGoogle = async () => {
    const supabase = createClient()
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    return supabase.auth.signOut()
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  return { session, user, loading, profile, isOnboarded, signInWithGoogle, signOut, refreshProfile }
}
