// lib/imageCompress.ts
//
// Client-side image compression. Resizes to a max edge length and re-encodes
// as JPEG, which strips EXIF (including GPS) as a side effect. Keeps Blob
// storage cheap and protects user privacy in one pass.

export interface CompressOptions {
  maxEdge?: number // longest side in pixels; default 2000
  quality?: number // JPEG quality 0..1; default 0.85
}

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<CompressedImage> {
  const maxEdge = opts.maxEdge ?? 2000
  const quality = opts.quality ?? 0.85

  // Decode the file. createImageBitmap is faster + handles orientation
  // automatically when imageOrientation is set to 'from-image'.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  // Compute target dimensions, preserving aspect ratio.
  let { width, height } = bitmap
  if (width > maxEdge || height > maxEdge) {
    if (width >= height) {
      height = Math.round((height * maxEdge) / width)
      width = maxEdge
    } else {
      width = Math.round((width * maxEdge) / height)
      height = maxEdge
    }
  }

  // Draw to canvas and re-encode.
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      quality
    )
  })

  return {
    blob,
    width,
    height,
    originalSize: file.size,
    compressedSize: blob.size,
  }
}

/**
 * Quick MIME check — accept common image formats users actually upload.
 * Note: HEIC/HEIF intentionally omitted — they don't decode via createImageBitmap
 * in Chrome/Firefox. iOS converts to JPEG when shared through the file picker,
 * so this is fine in practice. If users complain, add a heic2any conversion step.
 */
export function isSupportedImageType(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)
}
