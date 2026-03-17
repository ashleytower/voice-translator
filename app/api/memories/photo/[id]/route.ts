import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/memories/photo/:id
 *
 * Returns a signed URL for a memory photo from Supabase Storage.
 * The memory_node must belong to the authenticated user and have a photo_path.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  const { id } = await params

  // Fetch the memory_node, verifying it belongs to this user
  const { data: memory, error } = await supabase
    .from('memory_nodes')
    .select('photo_path, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  const photoPath = memory.photo_path
  if (typeof photoPath !== 'string' || photoPath.length === 0) {
    return NextResponse.json({ error: 'No photo for this memory' }, { status: 404 })
  }

  // Generate signed URL from Supabase Storage (1 hour expiry)
  const { data: signedUrl, error: storageError } = await supabase.storage
    .from('memory-photos')
    .createSignedUrl(photoPath, 3600)

  if (storageError || !signedUrl) {
    console.error('[MemoryPhoto] Storage error:', storageError?.message)
    return NextResponse.json({ error: 'Failed to generate photo URL' }, { status: 500 })
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    expiresIn: 3600,
  })
}
