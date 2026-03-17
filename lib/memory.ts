import { createClient } from '@/lib/supabase'
import type { MemoryNodeType } from '@/types/database'

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

  return data?.id ?? null
}
