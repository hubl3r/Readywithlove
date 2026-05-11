// app/api/cron/cleanup-drafts/route.ts
//
// Safety net: even with deferred draft creation (no draft created until first
// save), users can still create a draft, walk away, and never come back.
// Once a week, sweep drafts that have:
//   - state = 'drafting'
//   - no recipientName, no content, no mediaUrl
//   - older than 7 days
//
// Wired to vercel.json:
//   { "path": "/api/cron/cleanup-drafts", "schedule": "0 14 * * 0" }   // weekly Sunday 9am ET

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteBlob } from '@/lib/blob'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Find empty drafts older than 7 days
  const empties = await prisma.message.findMany({
    where: {
      state: 'drafting',
      createdAt: { lt: sevenDaysAgo },
      recipientName: '',
      content: null,
      mediaUrl: null,
    },
    select: { id: true, mediaUrl: true },
  })

  // Best-effort blob cleanup (should be a no-op since mediaUrl is null,
  // but defensive in case the filter ever changes)
  for (const m of empties) {
    if (m.mediaUrl) await deleteBlob(m.mediaUrl)
  }

  if (empties.length > 0) {
    await prisma.message.deleteMany({
      where: { id: { in: empties.map((m) => m.id) } },
    })
  }

  return NextResponse.json({ ok: true, deleted: empties.length })
}
