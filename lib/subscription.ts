import { createClient } from '@/lib/supabase'
import type { SubscriptionTier } from '@/types/database'

const VALID_TIERS: SubscriptionTier[] = ['free', 'paid']

function isValidTier(value: string): value is SubscriptionTier {
  return VALID_TIERS.includes(value as SubscriptionTier)
}

/**
 * Fetch the current subscription tier for a user.
 *
 * Returns 'free' if no subscription row exists or if the subscription has
 * expired. Treats null expires_at as "never expires" (lifetime / active).
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) return 'free'

  // Null expires_at means the subscription does not expire
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return 'free'
  }

  return isValidTier(data.tier) ? data.tier : 'free'
}
