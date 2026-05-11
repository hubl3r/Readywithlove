// app/api/invites/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'

/**
 * Revoke an invite (soft delete via revokedAt). Existing contributions made
 * through this invite are preserved — revoking just stops new submissions.
 * If you want to also delete the contributions, that's a separate action
 * on the contributions themselves (Zip 2c.2).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const { id } = await params

  const invite = await prisma.messageInvite.findUnique({
    where: { id },
    select: { userId: true, revokedAt: true },
  })
  if (!invite || invite.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (invite.revokedAt) {
    // Idempotent — already revoked, return success
    return NextResponse.json({ ok: true, alreadyRevoked: true })
  }

  await prisma.messageInvite.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
