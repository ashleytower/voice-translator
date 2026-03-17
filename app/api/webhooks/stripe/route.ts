import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe payment events for Travel Memory Pass purchases.
 * On successful checkout, grants 14-day paid access by upserting user_subscriptions.
 *
 * Validates webhook signature to prevent spoofing.
 * Uses Supabase service-role client to bypass RLS for subscription writes.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret) {
    console.warn('[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ received: true, stub: true })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Stripe Webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ received: true, stub: true })
  }

  const stripe = new Stripe(stripeSecret)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ received: true, error: 'Missing signature' })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json({ received: true, error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id ?? session.metadata?.userId
      if (!userId) {
        console.warn('[Stripe Webhook] checkout.session.completed missing userId')
        break
      }

      // Grant 14-day access window for Travel Memory Pass
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

      const { error } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier: 'paid',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })

      if (error) {
        console.error('[Stripe Webhook] Failed to upsert subscription:', error.message)
      } else {
        console.log(`[Stripe Webhook] Granted 14-day access to user ${userId}`)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // Future: handle recurring subscription lifecycle if we add monthly plans.
      // Current model is one-time payment with 14-day window via checkout.session.completed.
      console.log(`[Stripe Webhook] Received ${event.type} - no action needed for one-time pass model`)
      break
    }
  }

  return NextResponse.json({ received: true })
}
