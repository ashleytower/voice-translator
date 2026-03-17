import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * POST /api/subscription/checkout
 *
 * Creates a Stripe Checkout session for a one-time Travel Memory Pass purchase.
 * Returns the Stripe-hosted checkout URL for redirect.
 *
 * Auth: Reads Supabase session from cookies.
 * Response: { url } with the Stripe Checkout URL
 */
export async function POST(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripePriceId = process.env.STRIPE_PRICE_ID

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (!stripeSecretKey || !stripePriceId) {
    return NextResponse.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.' },
      { status: 501 },
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const stripe = new Stripe(stripeSecretKey)

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foundintranslation.app'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${origin}/explore?upgraded=true`,
    cancel_url: `${origin}/explore`,
    client_reference_id: user.id,
    metadata: { userId: user.id },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
