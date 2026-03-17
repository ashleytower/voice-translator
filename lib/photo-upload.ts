'use client'

import { createClient } from '@/lib/supabase'
import { compressImage } from '@/lib/image-compress'

/**
 * Compress and upload a memory photo to Supabase Storage.
 *
 * @returns The storage path on success, null on failure.
 */
export async function uploadMemoryPhoto(
  userId: string,
  memoryNodeId: string,
  imageDataUrl: string
): Promise<string | null> {
  try {
    const blob = await compressImage(imageDataUrl)
    const supabase = createClient()

    const path = `${userId}/${memoryNodeId}.jpg`

    const { error } = await supabase.storage
      .from('memory-photos')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error('Photo upload failed:', error.message)
      return null
    }

    return path
  } catch (err) {
    console.error('Photo upload error:', err)
    return null
  }
}
