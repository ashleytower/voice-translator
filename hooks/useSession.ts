'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { TravelerProfile } from '@/types/database'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<TravelerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const isOnboarded = profile !== null && profile.onboarded_at !== null

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('traveler_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Use getUser() for secure server-validated check, then getSession() for session object
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(user)
        await fetchProfile(user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
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
