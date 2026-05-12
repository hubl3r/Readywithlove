// app/api/messages/[id]/upload-photo-url/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'

const MAX_PHOTO_BYTES = 20 * 1024 * 1024 // 20MB

const ALLOWED_PHOTO_CONTENT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

/**
 * Photo client-upload-token handler for outgoing photo messages.
 *
 * Mirrors the video upload-url route but with photo MIME types and a
 * smaller size cap. Same Clerk-cookie-on-token-gen-only,
 * Vercel-HMAC-on-webhook pattern as the video route.
 *
 * The photo quota (shared with timeline photos) isn't enforced here
 * because photo messages don't consume the timeline photo allowance.
 * Each photo message is independent. If we ever decide to count photo
 * messages against the photo quota, the check goes in
 * onBeforeGenerateToken below.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params
  const body = (await request.json()) as HandleUploadBody

  if (body.type === 'blob.upload-completed') {
    try {
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_PHOTO_CONTENT,
          maximumSizeInBytes: MAX_PHOTO_BYTES,
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
            console.error('[upload-photo-url] webhook failed to update message:', err)
          }
        },
      })
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  // Token-generation path — user picking a photo
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, state: true, type: true },
  })
  if (!message || message.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (message.state === 'sent') {
    return NextResponse.json({ error: 'Cannot modify a sent message' }, { status: 400 })
  }
  if (message.type !== 'photo') {
    return NextResponse.json(
      { error: 'This endpoint is only for photo messages' },
      { status: 400 }
    )
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_PHOTO_CONTENT,
        maximumSizeInBytes: MAX_PHOTO_BYTES,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId, messageId }),
      }),
      onUploadCompleted: async () => {/* webhook handled in branch above */},
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
