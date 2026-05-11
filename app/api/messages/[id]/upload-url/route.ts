// app/api/messages/[id]/upload-url/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'
import { getMessageMinutesLimit } from '@/lib/plans'

// Max single video file size — 500 MB cap per our earlier decision.
const MAX_VIDEO_BYTES = 500 * 1024 * 1024

/**
 * Vercel Blob client-upload token handler.
 *
 * Flow:
 * 1. Browser calls upload() from @vercel/blob/client with this URL as handleUploadUrl
 * 2. The SDK first POSTs here with type=blob.generate-client-token
 * 3. We auth + authorize, return a short-lived token
 * 4. Browser uploads directly to Blob
 * 5. The SDK POSTs back here with type=blob.upload-completed (we record metadata)
 *
 * Without this server route the client can't upload — there's no public token.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: messageId } = await params

  // Verify ownership of the message we're uploading for
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, state: true },
  })
  if (!message || message.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (message.state === 'sent') {
    return NextResponse.json({ error: 'Cannot modify a sent message' }, { status: 400 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname) => {
        // Plan-aware video minute cap (not file size — we cap files at 500MB regardless)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { plan: true },
        })
        const minutesLimit = getMessageMinutesLimit(user?.plan)
        if (minutesLimit >= 0) {
          const totalSeconds = await prisma.message.aggregate({
            where: { userId, mediaDurationSec: { not: null } },
            _sum: { mediaDurationSec: true },
          })
          const usedMinutes = Math.ceil((totalSeconds._sum.mediaDurationSec ?? 0) / 60)
          if (usedMinutes >= minutesLimit) {
            throw new Error(`Plan limit reached: ${usedMinutes}/${minutesLimit} video minutes`)
          }
        }

        return {
          // Limit content types we accept. WebM, MP4, MOV, QuickTime cover all browsers.
          allowedContentTypes: ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska'],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          // Stash the messageId so we can match it up in onUploadCompleted
          tokenPayload: JSON.stringify({ userId, messageId }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Runs after the client finishes uploading to Blob.
        // NOTE: This callback does NOT fire on localhost (Vercel can't reach
        // your dev server). The client also PATCHes the message after upload
        // as a fallback — see VideoRecorder.tsx. This server-side handler is
        // belt-and-suspenders for production where it DOES fire.
        const parsed = tokenPayload ? JSON.parse(tokenPayload) : {}
        if (parsed.messageId !== messageId) return
        try {
          await prisma.message.update({
            where: { id: messageId },
            data: {
              mediaUrl: blob.url,
              mediaBlobPath: blob.pathname,
            },
          })
        } catch (err) {
          // onUploadCompleted failures don't reach the client — log loudly.
          console.error('[upload-url] failed to update message after upload:', err)
        }
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
