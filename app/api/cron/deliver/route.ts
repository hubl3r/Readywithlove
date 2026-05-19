// app/api/cron/deliver/route.ts
//
// Daily cron entry point. Vercel calls this at 6am UTC (see vercel.json).
// Scans for messages whose trigger date is past, delivers them, marks sent.
//
// Authentication: Vercel sets an `authorization: Bearer <CRON_SECRET>`
// header on cron-triggered requests. We verify against CRON_SECRET env var.
// Without that secret set, the route returns 503 — safer than running on
// any unauthenticated request.
//
// Idempotency: messages transition to state='sent' inside the same DB
// update, so a re-run on the same day won't double-send (the query won't
// pick them up again). If sending fails partway, that message stays
// 'scheduled' and gets retried on the next cron run.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverMessage } from '@/lib/messageDelivery'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify the request actually came from Vercel's cron, not a random caller
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron] CRON_SECRET not set — refusing to run')
    return NextResponse.json(
      { error: 'Cron is not configured' },
      { status: 503 }
    )
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all messages whose trigger date is now in the past and are still
  // sitting in 'scheduled' state. We don't fetch users with a deceasedAt
  // here — that's a different flow (the trigger-on-death feature). This
  // cron handles the simpler "schedule for a specific date" case.
  const due = await prisma.message.findMany({
    where: {
      state: 'scheduled',
      triggerDate: { lte: now },
    },
    select: {
      id: true,
      userId: true,
      recipientEmail: true,
      recipientName: true,
      subject: true,
      type: true,
    },
    take: 100, // safety cap — won't process more than 100 per run
  })

  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const m of due) {
    try {
      await deliverMessage(m.id)
      results.push({ id: m.id, ok: true })
    } catch (err) {
      console.error(`[cron] delivery failed for message ${m.id}:`, err)
      results.push({
        id: m.id,
        ok: false,
        error: (err as Error).message,
      })
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    details: results,
  })
}
