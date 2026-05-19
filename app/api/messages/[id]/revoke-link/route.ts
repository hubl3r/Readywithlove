// app/api/messages/[id]/revoke-link/route.ts
//
// Zip 2c.6: sender revokes a delivered message's recipient link.
//
// Side-effects: sets Message.linkRevokedAt = now. Recipient page reads this
// and shows "no longer available" instead of content. Reversible by clearing
// the field (no UI for that yet — owner support task).

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Verify the caller owns this message. Cheaper than a generic
  // updateMany because we want a 404 vs 403 distinction.
  const msg = await prisma.message.findUnique({
    where: { id },
    select: { userId: true, linkRevokedAt: true, state: true },
  })
  if (!msg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (msg.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (msg.state !== 'sent') {
    return NextResponse.json(
      { error: 'Only delivered messages can be revoked' },
      { status: 400 }
    )
  }
  if (msg.linkRevokedAt) {
    // Already revoked — idempotent success
    return NextResponse.json({ linkRevokedAt: msg.linkRevokedAt.toISOString() })
  }

  const now = new Date()
  await prisma.message.update({
    where: { id },
    data: { linkRevokedAt: now },
  })

  return NextResponse.json({ linkRevokedAt: now.toISOString() })
}
