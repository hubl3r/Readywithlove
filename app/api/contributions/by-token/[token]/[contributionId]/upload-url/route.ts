// app/api/contributions/by-token/[token]/[contributionId]/upload-url/route.ts
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'
import { computeLockStatus } from '@/lib/contributionLock'

const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const MAX_PHOTO_BYTES = 20 * 1024 * 1024

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
 * Public Vercel Blob client-upload token endpoint for REPLACING media on
 * an existing contribution. Distinct from /api/contributions/upload-url
 * (which is for new contributions): this one validates against a specific
 * contribution row AND its lock status.
 *
 * Auth model: token (path param) + contributionId (path param) + the
 * clientPayload's `kind` (video/photo) determines size + MIME caps.
 *
 * Lock enforcement happens in onBeforeGenerateToken — if the contribution
 * is already locked (viewed or >24h), we refuse to issue an upload token.
 * This means the browser can't even start the upload, let alone PATCH the
 * row with new media.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; contributionId: string }> }
) {
  const { token, contributionId } = await params
  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayloadString) => {
        if (!clientPayloadString) throw new Error('Missing clientPayload')
        let parsed: { kind?: string }
        try {
          parsed = JSON.parse(clientPayloadString)
        } catch {
          throw new Error('Invalid clientPayload JSON')
        }
        const kind = parsed.kind === 'photo' ? 'photo' : 'video'

        // Validate the invite + contribution + lock status all in one go
        const invite = await prisma.messageInvite.findUnique({
          where: { token },
          select: { id: true },
        })
        if (!invite) throw new Error('Invitation no longer valid')

        const contribution = await prisma.contribution.findUnique({
          where: { id: contributionId },
          select: {
            id: true,
            inviteId: true,
            type: true,
            createdAt: true,
            viewedByUser: true,
          },
        })
        if (!contribution || contribution.inviteId !== invite.id) {
          throw new Error('Contribution not found')
        }
        if (contribution.type !== 'video' && contribution.type !== 'photo') {
          throw new Error('Media can only be replaced on video or photo contributions')
        }
        if ((kind === 'video' && contribution.type !== 'video') ||
            (kind === 'photo' && contribution.type !== 'photo')) {
          throw new Error("Replacement media must match the contribution's original type")
        }

        const lock = computeLockStatus(contribution.createdAt, contribution.viewedByUser)
        if (lock.locked) {
          throw new Error(
            lock.reason === 'viewed'
              ? 'This contribution has already been viewed by the recipient and can no longer be edited'
              : 'The edit window has closed'
          )
        }

        return {
          allowedContentTypes:
            kind === 'photo' ? ALLOWED_PHOTO_CONTENT : ALLOWED_VIDEO_CONTENT,
          maximumSizeInBytes: kind === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            contributionId: contribution.id,
            kind,
          }),
        }
      },
      onUploadCompleted: async () => {
        // No-op — the client will PATCH the contribution row with the
        // new media URL and path after upload() returns. We can't update
        // the row here because the upload completion webhook doesn't have
        // a guaranteed-fresh view of the contribution (race with the
        // client's PATCH).
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
