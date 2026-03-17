import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/subscription/checkout
 *
 * Creates a Stripe Checkout session for subscription upgrade.
 *
 * Currently returns a 501 stub because the `stripe` npm package is not
 * installed. Once installed, this route will create a real Stripe Checkout
 * session and return the redirect URL.
 *
 * Auth: Reads Supabase session from cookies.
 * Response (stub): { error, message } with status 501
 * Response (live): { url } with the Stripe Checkout URL
 */
export async function POST(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
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

  // ── Stripe package not installed -- return stub ──
  // TODO: Once `stripe` is installed, replace this block with real Checkout logic:
  //
  // 1. Validate STRIPE_SECRET_KEY and STRIPE_PRICE_ID env vars
  // 2. Create Stripe instance: new Stripe(STRIPE_SECRET_KEY)
  // 3. Create checkout session:
  //    const session = await stripe.checkout.sessions.create({
  //      mode: 'subscription',
  //      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
  //      customer_email: user.email,
  //      success_url: `${origin}/explore?upgraded=true`,
  //      cancel_url: `${origin}/explore`,
  //      client_reference_id: user.id,
  //      metadata: { userId: user.id },
  //    })
  // 4. Return { url: session.url }

  return NextResponse.json(
    {
      error: 'Stripe not configured',
      message:
        'Install stripe package and set STRIPE_SECRET_KEY to enable payments',
    },
    { status: 501 },
  )
}
