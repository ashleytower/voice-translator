import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
interface PreferenceSummary {
  category: string
  score: number
  sample_count: number
}

/**
 * GET /api/preferences/summary
 *
 * Returns the authenticated user's top preference signals,
 * along with parsed top cuisines and top types.
 *
 * Auth: Reads Supabase session from cookies (same pattern as auth/callback).
 * Response: { preferences: PreferenceSummary[], topCuisines: string[], topTypes: string[] }
 */
export async function GET(): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore with middleware refreshing sessions.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('category, score, sample_count')
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[Preferences] Query error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }

  const preferences: PreferenceSummary[] = data ?? []

  const topCuisines: string[] = []
  const topTypes: string[] = []

  for (const pref of preferences) {
    if (pref.category.startsWith('cuisine:')) {
      topCuisines.push(pref.category.slice('cuisine:'.length))
    } else if (pref.category.startsWith('type:')) {
      topTypes.push(pref.category.slice('type:'.length))
    }
  }

  return NextResponse.json({ preferences, topCuisines, topTypes })
}
