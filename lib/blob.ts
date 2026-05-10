// lib/blob.ts
import { put, del } from '@vercel/blob'

export const BLOB_CONFIGURED = !!process.env.BLOB_READ_WRITE_TOKEN

export class BlobNotConfiguredError extends Error {
  constructor() {
    super(
      'Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN in your environment. ' +
        'See README_BLOB_SETUP.md for setup instructions.'
    )
    this.name = 'BlobNotConfiguredError'
  }
}

export interface UploadOptions {
  filename: string
  contentType: string
  body: Blob | ArrayBuffer | Uint8Array
}

export interface UploadResult {
  url: string
  pathname: string // store this for deletion later
  size: number
}

/**
 * Upload a file to Vercel Blob with a randomized suffix on the path
 * so conflicting filenames don't overwrite each other.
 */
export async function uploadBlob(opts: UploadOptions): Promise<UploadResult> {
  if (!BLOB_CONFIGURED) throw new BlobNotConfiguredError()

  const result = await put(opts.filename, opts.body, {
    access: 'public',
    contentType: opts.contentType,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return {
    url: result.url,
    pathname: result.pathname,
    size:
      opts.body instanceof Blob
        ? opts.body.size
        : opts.body instanceof ArrayBuffer
          ? opts.body.byteLength
          : opts.body.byteLength,
  }
}

/**
 * Delete a blob by its URL. Failures are logged but not thrown — orphaned
 * blobs are recoverable via Vercel dashboard, but a failed delete shouldn't
 * block the user from removing a photo from their UI.
 */
export async function deleteBlob(url: string): Promise<void> {
  if (!BLOB_CONFIGURED) return // silently no-op in dev without token
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch (err) {
    console.error('[blob] delete failed:', err)
  }
}
