import { NextResponse } from 'next/server'

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events (checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted).
 *
 * Currently a placeholder because the `stripe` npm package is not installed.
 * Always returns 200 to prevent Stripe from retrying.
 *
 * Once `stripe` is installed, this route should:
 * 1. Validate the webhook signature using STRIPE_WEBHOOK_SECRET
 * 2. Parse the event type
 * 3. Handle each event using a Supabase service-role client:
 *    - checkout.session.completed: upsert user_subscriptions row
 *    - customer.subscription.updated: update tier/expiry
 *    - customer.subscription.deleted: set tier to 'free'
 */
export async function POST(): Promise<Response> {
  // Validate env vars without ! assertions
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret) {
    console.warn(
      '[Stripe Webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set. ' +
        'Install stripe package and configure env vars to enable webhook handling.',
    )
    // Always return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true, stub: true })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      '[Stripe Webhook] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.',
    )
    return NextResponse.json({ received: true, stub: true })
  }

  // ── Stripe package not installed -- return stub ──
  // TODO: Once `stripe` is installed, implement real webhook handling:
  //
  // import Stripe from 'stripe'
  // import { createClient } from '@supabase/supabase-js'
  //
  // const stripe = new Stripe(stripeSecret)
  // const supabase = createClient(supabaseUrl, serviceRoleKey)
  //
  // const body = await request.text()
  // const sig = request.headers.get('stripe-signature')
  // if (!sig) return NextResponse.json({ received: true })
  //
  // let event: Stripe.Event
  // try {
  //   event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  // } catch (err) {
  //   console.error('[Stripe Webhook] Signature verification failed:', err)
  //   return NextResponse.json({ received: true })
  // }
  //
  // switch (event.type) {
  //   case 'checkout.session.completed': {
  //     const session = event.data.object as Stripe.Checkout.Session
  //     const userId = session.client_reference_id ?? session.metadata?.userId
  //     if (!userId) break
  //     await supabase.from('user_subscriptions').upsert({
  //       user_id: userId,
  //       tier: 'paid',
  //       stripe_customer_id: session.customer as string,
  //       stripe_subscription_id: session.subscription as string,
  //       started_at: new Date().toISOString(),
  //       expires_at: null,
  //       updated_at: new Date().toISOString(),
  //     })
  //     break
  //   }
  //   case 'customer.subscription.updated': {
  //     const sub = event.data.object as Stripe.Subscription
  //     const { data: row } = await supabase
  //       .from('user_subscriptions')
  //       .select('user_id')
  //       .eq('stripe_subscription_id', sub.id)
  //       .single()
  //     if (!row) break
  //     await supabase.from('user_subscriptions').update({
  //       tier: sub.status === 'active' ? 'paid' : 'free',
  //       expires_at: sub.current_period_end
  //         ? new Date(sub.current_period_end * 1000).toISOString()
  //         : null,
  //       updated_at: new Date().toISOString(),
  //     }).eq('user_id', row.user_id)
  //     break
  //   }
  //   case 'customer.subscription.deleted': {
  //     const sub = event.data.object as Stripe.Subscription
  //     const { data: row } = await supabase
  //       .from('user_subscriptions')
  //       .select('user_id')
  //       .eq('stripe_subscription_id', sub.id)
  //       .single()
  //     if (!row) break
  //     await supabase.from('user_subscriptions').update({
  //       tier: 'free',
  //       updated_at: new Date().toISOString(),
  //     }).eq('user_id', row.user_id)
  //     break
  //   }
  // }

  console.warn(
    '[Stripe Webhook] Stub handler invoked. Install stripe package to process events.',
  )
  return NextResponse.json({ received: true, stub: true })
}
