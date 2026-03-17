'use client'

/**
 * Compress a data-URL image to a JPEG Blob under a target file size.
 *
 * 1. Loads the dataUrl into an HTMLImageElement.
 * 2. Scales down if either dimension exceeds maxDimension (preserving aspect ratio).
 * 3. Iteratively lowers JPEG quality until the Blob is under maxSizeKB.
 */
export async function compressImage(
  dataUrl: string,
  maxSizeKB = 200,
  maxDimension = 1200
): Promise<Blob> {
  const img = await loadImage(dataUrl)

  // Determine scaled dimensions
  let { width, height } = img
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.drawImage(img, 0, 0, width, height)

  // Iteratively lower quality until under maxSizeKB
  const maxBytes = maxSizeKB * 1024
  let quality = 0.85
  const MIN_QUALITY = 0.3
  const QUALITY_STEP = 0.1

  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > maxBytes && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP
    blob = await canvasToBlob(canvas, quality)
  }

  return blob
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('toBlob returned null'))
      },
      'image/jpeg',
      quality
    )
  })
}
