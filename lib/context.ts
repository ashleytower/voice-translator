import { createClient } from '@/lib/supabase'
import type { TravelerProfile, MemoryNode } from '@/types/database'

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

  return context
}
