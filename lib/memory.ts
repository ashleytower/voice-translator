import { createClient } from '@/lib/supabase'
import type { MemoryNodeType } from '@/types/database'

export async function saveMemory(
  type: MemoryNodeType,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return // No-op for unauthenticated users

  await supabase.from('memory_nodes').insert({
    user_id: user.id,
    type,
    content,
    metadata: metadata ?? {},
  })
}
