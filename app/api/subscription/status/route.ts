import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/subscription/status
 *
 * Returns the authenticated user's subscription tier, expiration, and
 * whether they have an active (non-expired) subscription.
 *
 * Auth: Reads Supabase session from cookies.
 * Response: { tier, expiresAt, hasActiveSubscription }
 */
export async function GET(): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(url, key, {
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
          // Called from a Server Component -- safe to ignore with middleware refreshing sessions.
        }
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier, expires_at, started_at, stripe_customer_id, stripe_subscription_id, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    // No subscription row means free tier
    return NextResponse.json({
      tier: 'free',
      expiresAt: null,
      hasActiveSubscription: false,
    })
  }

  // Null expires_at means subscription does not expire (lifetime / active)
  const isExpired = data.expires_at
    ? new Date(data.expires_at) < new Date()
    : false

  const tier = isExpired ? 'free' : data.tier
  const hasActiveSubscription = tier === 'paid'

  return NextResponse.json({
    tier,
    expiresAt: data.expires_at,
    hasActiveSubscription,
  })
}
