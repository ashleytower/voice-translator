import { createClient } from '@/lib/supabase'
import type { MemoryNodeType } from '@/types/database'
import { extractSignals, updatePreferences } from '@/lib/preference-engine'

export interface SaveMemoryOptions {
  city?: string | null
  country?: string | null
  lat?: number | null
  lng?: number | null
  photo_path?: string | null
}

export async function saveMemory(
  type: MemoryNodeType,
  content: string,
  metadata?: Record<string, unknown>,
  options?: SaveMemoryOptions
): Promise<string | null> {
  const supabase = createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // No-op for unauthenticated users

  const { data, error } = await supabase.from('memory_nodes').insert({
    user_id: user.id,
    type,
    content,
    metadata: metadata ?? {},
    ...(options?.city != null && { city: options.city }),
    ...(options?.country != null && { country: options.country }),
    ...(options?.lat != null && { lat: options.lat }),
    ...(options?.lng != null && { lng: options.lng }),
    ...(options?.photo_path != null && { photo_path: options.photo_path }),
  }).select('id').single()

  if (error) {
    console.error('saveMemory error:', error.message)
    return null
  }

  // Fire-and-forget preference extraction — do not block the return
  if (data?.id) {
    const signals = extractSignals(type, content, metadata ?? {})
    if (signals.length > 0) {
      updatePreferences(user.id, signals).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('updatePreferences error:', message)
      })
    }
  }

  return data?.id ?? null
}
