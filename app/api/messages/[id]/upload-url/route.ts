// app/api/messages/[id]/upload-url/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'
import { getMessageMinutesLimit } from '@/lib/plans'

const MAX_VIDEO_BYTES = 500 * 1024 * 1024

/**
 * Vercel Blob client-upload token handler.
 *
 * Flow:
 * 1. Browser calls upload() from @vercel/blob/client with this URL
 * 2. SDK POSTs here with body.type === 'blob.generate-client-token'
 *    → we authenticate the user and return a short-lived upload token
 * 3. Browser uploads directly to Vercel Blob with that token
 * 4. SDK POSTs back here with body.type === 'blob.upload-completed'
 *    → this is a SERVER-TO-SERVER webhook from Vercel, NO Clerk cookie
 *    → we record the media URL on the message row
 *
 * The crucial detail: step 4 has no user session. If we Clerk-auth-gate
 * the whole route, the webhook gets 401 and onUploadCompleted never fires,
 * meaning the media URL is never persisted to the message.
 *
 * Vercel Blob authenticates the webhook itself (HMAC-style via the
 * upload token), so we can safely let it through without our own auth.
 * handleUpload() verifies the request signature before invoking
 * onUploadCompleted.
 *
 * The redundant client-side PATCH in VideoRecorder is still useful as a
 * fallback (e.g. for localhost where Vercel can't reach the dev server).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params
  const body = (await request.json()) as HandleUploadBody

  // Webhook path — Vercel Blob calling us back after the client finished
  // uploading. No Clerk session. Trust the SDK's signature validation.
  if (body.type === 'blob.upload-completed') {
    try {
      const result = await handleUpload({
        request,
        body,
        // onBeforeGenerateToken is never invoked on this path, but the
        // type signature still requires it.
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska'],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: '',
        }),
        onUploadCompleted: async ({ blob, tokenPayload }) => {
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
            console.error('[upload-url] webhook failed to update message:', err)
          }
        },
      })
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  // Token-generation path — user clicking Accept. Require auth.
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
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
          allowedContentTypes: ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska'],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId, messageId }),
        }
      },
      // Stub — for the token path, the webhook isn't invoked from here.
      // The webhook handler above (separate branch) is what runs when
      // Vercel calls back.
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
