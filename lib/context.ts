import { createClient } from '@/lib/supabase'
import type { TravelerProfile, MemoryNode, UserPreference } from '@/types/database'
import { getUserTier } from '@/lib/subscription'

export async function assembleContext(userId: string): Promise<string | null> {
  const supabase = createClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('traveler_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!profile) return null

  // Fetch last 20 memories
  const { data: memories } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Build context string
  let context = `\nTRAVELER PROFILE:\n`
  context += `- Languages: ${profile.languages.join(', ')}\n`
  context += `- Travel style: ${profile.travel_style}\n`
  if (profile.dietary.length > 0) {
    context += `- Dietary: ${profile.dietary.join(', ')}\n`
  }
  context += `- Home currency: ${profile.home_currency}\n`

  if (memories && memories.length > 0) {
    context += `\nRECENT MEMORIES:\n`
    for (const m of memories) {
      context += `- [${m.type}] ${m.content}\n`
    }
  }

  // Append taste preferences for paid users
  const tier = await getUserTier(userId)
  if (tier === 'paid') {
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('category, score, sample_count')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(10)

    if (preferences && preferences.length > 0) {
      context += `\nTASTE PREFERENCES:\n`
      for (const pref of preferences) {
        const score = typeof pref.score === 'number' ? pref.score.toFixed(2) : '0.00'
        const samples = typeof pref.sample_count === 'number' ? pref.sample_count : 0
        context += `- ${pref.category} (score: ${score}, ${samples} samples)\n`
      }
    }
  }

  return context
}
