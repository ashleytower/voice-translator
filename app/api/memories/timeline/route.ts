import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { MemoryNode } from '@/types/database'

interface CityGroup {
  city: string
  count: number
}

interface TimelineResponse {
  memories: MemoryNode[]
  groups: CityGroup[]
  page: number
  hasMore: boolean
}

/**
 * GET /api/memories/timeline
 *
 * Returns paginated memories grouped by city for the authenticated user.
 * Query params:
 *   - page (optional, default 1)
 *   - limit (optional, default 20)
 */
export async function GET(request: NextRequest): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    url,
    key,
    {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse pagination params
  const { searchParams } = request.nextUrl
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const page = Math.max(1, pageParam ? Number(pageParam) : 1)
  const limit = Math.min(100, Math.max(1, limitParam ? Number(limitParam) : 20))
  const offset = (page - 1) * limit

  // Fetch total count for hasMore calculation
  const { count: totalCount, error: countError } = await supabase
    .from('memory_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) {
    console.error('[Timeline] Count error:', countError.message)
    return NextResponse.json({ error: 'Failed to count memories' }, { status: 500 })
  }

  const total = totalCount ?? 0

  // Fetch paginated memories ordered by created_at DESC
  const { data, error } = await supabase
    .from('memory_nodes')
    .select('id, user_id, type, content, metadata, city, country, lat, lng, photo_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Timeline] Query error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
  }

  const memories: MemoryNode[] = (data ?? []).map((row) => ({
    id: typeof row.id === 'string' ? row.id : '',
    user_id: typeof row.user_id === 'string' ? row.user_id : '',
    type: row.type as MemoryNode['type'],
    content: typeof row.content === 'string' ? row.content : '',
    metadata: (typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}) as Record<string, unknown>,
    city: typeof row.city === 'string' ? row.city : null,
    country: typeof row.country === 'string' ? row.country : null,
    lat: typeof row.lat === 'number' ? row.lat : null,
    lng: typeof row.lng === 'number' ? row.lng : null,
    photo_path: typeof row.photo_path === 'string' ? row.photo_path : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
  }))

  // Group by city
  const cityCountMap = new Map<string, number>()
  for (const memory of memories) {
    const cityKey = memory.city ?? 'Unknown'
    cityCountMap.set(cityKey, (cityCountMap.get(cityKey) ?? 0) + 1)
  }

  const groups: CityGroup[] = []
  cityCountMap.forEach((count, city) => {
    groups.push({ city, count })
  })

  const hasMore = offset + limit < total

  const response: TimelineResponse = {
    memories,
    groups,
    page,
    hasMore,
  }

  return NextResponse.json(response)
}
