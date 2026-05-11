// app/api/contributions/upload-url/route.ts
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'

const MAX_VIDEO_BYTES = 500 * 1024 * 1024 // 500 MB
const MAX_PHOTO_BYTES = 20 * 1024 * 1024  // 20 MB

const ALLOWED_VIDEO_CONTENT = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
]
const ALLOWED_PHOTO_CONTENT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

/**
 * Public Vercel Blob client-upload token handler for contributions.
 *
 * This is the contributor counterpart to /api/messages/[id]/upload-url, but
 * authenticated by an invite token rather than a Clerk session. The flow:
 *
 *   1. Contributor's browser calls upload() from @vercel/blob/client with:
 *        - handleUploadUrl: /api/contributions/upload-url
 *        - clientPayload: JSON.stringify({ token, kind })  // kind = 'video'|'photo'
 *      The token is the MessageInvite.token. `kind` lets us apply the right
 *      size/MIME limits without inspecting the file ourselves.
 *
 *   2. SDK POSTs here with body.type === 'blob.generate-client-token'
 *      and clientPayload as a string. We:
 *        - Validate the token is active (not revoked, not expired)
 *        - Return allowedContentTypes + maximumSizeInBytes based on kind
 *
 *   3. Browser uploads directly to Vercel Blob with that short-lived token.
 *
 *   4. SDK POSTs back here with body.type === 'blob.upload-completed'.
 *      No-op (contributions don't have a parent row to patch — the row is
 *      created at submit time, with the URL already in hand from the
 *      client-side upload() return value).
 *
 * Importantly, this endpoint never opens a Clerk session and doesn't need
 * to. The token in clientPayload is the auth.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayloadString) => {
        // Parse the client payload — contains the invite token and a hint
        // about whether this is a video or photo upload.
        if (!clientPayloadString) {
          throw new Error('Missing clientPayload')
        }
        let parsed: { token?: string; kind?: string }
        try {
          parsed = JSON.parse(clientPayloadString)
        } catch {
          throw new Error('Invalid clientPayload JSON')
        }
        const token = (parsed.token ?? '').trim()
        const kind = parsed.kind === 'photo' ? 'photo' : 'video'
        if (!token) {
          throw new Error('Missing invitation token')
        }

        // Validate the invite
        const invite = await prisma.messageInvite.findUnique({
          where: { token },
          select: { id: true, revokedAt: true, expiresAt: true },
        })
        if (!invite) throw new Error('Invitation no longer valid')
        if (invite.revokedAt) throw new Error('Invitation has been revoked')
        if (invite.expiresAt < new Date()) throw new Error('Invitation has expired')

        return {
          allowedContentTypes:
            kind === 'photo' ? ALLOWED_PHOTO_CONTENT : ALLOWED_VIDEO_CONTENT,
          maximumSizeInBytes: kind === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          // We don't strictly need a tokenPayload since onUploadCompleted is
          // a no-op for contributions, but include it for trace context if
          // we ever want to log later.
          tokenPayload: JSON.stringify({ inviteId: invite.id, kind }),
        }
      },
      // Webhook callback after the browser finishes uploading. The
      // contribution row is created by the client via /api/contributions
      // POST, with the URL it got from upload(), so we have nothing to
      // do here. Leaving this as a no-op (but defined — handleUpload's
      // type signature requires it).
      onUploadCompleted: async () => {
        // Intentionally empty. See block comment at top of file.
      },
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    )
  }
}
