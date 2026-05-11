// app/api/cron/messages/route.ts
//
// Daily message state machine processor. Wired to Vercel Cron via vercel.json:
//   { "path": "/api/cron/messages", "schedule": "0 13 * * *" }   // 8am ET = 13:00 UTC
//
// Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header. We verify
// it to prevent random callers from triggering deliveries.
//
// Three jobs per run:
//   1. SCHEDULED → PENDING_APPROVAL (when trigger arrives, user is alive)
//      Sends first approval email.
//   2. PENDING_APPROVAL → SENT (14-day silence → silence-implies-approve)
//      OR sends a daily reminder if still within window.
//   3. DECEASED auto-deliver: any scheduled/pending message with triggerDate
//      already passed → deliver immediately.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverMessage } from '@/lib/messageDelivery'
import { sendApprovalPrompt } from '@/lib/email/sendApprovalPrompt'
import { approvalExpiryFrom, APPROVAL_WINDOW_DAYS } from '@/lib/messageHelpers'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

interface RunSummary {
  scheduledTransitioned: number
  remindersSent: number
  approvalsAutoSent: number
  deceasedAutoSent: number
  errors: string[]
}

async function processMessages(): Promise<RunSummary> {
  const summary: RunSummary = {
    scheduledTransitioned: 0,
    remindersSent: 0,
    approvalsAutoSent: 0,
    deceasedAutoSent: 0,
    errors: [],
  }
  const now = new Date()

  // ---- Job 3 first: deceased-state auto-delivery ----
  // If the user has deceasedAt set, deliver every scheduled/pending message
  // whose triggerDate is in the past, immediately, no approval needed.
  const deceasedDue = await prisma.message.findMany({
    where: {
      state: { in: ['scheduled', 'pending_approval'] },
      triggerDate: { lte: now },
      user: { deceasedAt: { not: null } },
    },
    select: { id: true },
  })
  for (const m of deceasedDue) {
    try {
      await deliverMessage(m.id)
      summary.deceasedAutoSent++
    } catch (err) {
      summary.errors.push(`deceased deliver ${m.id}: ${(err as Error).message}`)
    }
  }

  // ---- Job 1: scheduled → pending_approval ----
  const due = await prisma.message.findMany({
    where: {
      state: 'scheduled',
      triggerDate: { lte: now },
      user: { deceasedAt: null }, // alive
    },
    include: { user: { select: { name: true, email: true } } },
  })
  for (const m of due) {
    try {
      const expiresAt = approvalExpiryFrom(now)
      const updated = await prisma.message.update({
        where: { id: m.id },
        data: {
          state: 'pending_approval',
          approvalPromptedAt: now,
          approvalExpiresAt: expiresAt,
          approvalRemindersSent: 0,
        },
      })

      if (m.user.email && m.approvalToken) {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.readywithlove.com'
        await sendApprovalPrompt({
          to: m.user.email,
          userFirstName: m.user.name ?? 'friend',
          recipientName: m.recipientName,
          triggerDateLabel: (m.triggerDate ?? now).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          approvalUrl: `${base}/api/messages/${m.id}/approve?token=${m.approvalToken}`,
          postponeUrl: `${base}/dashboard/messages/${m.id}/edit`,
          cancelUrl: `${base}/api/messages/${m.id}/archive?token=${m.approvalToken}`,
          viewUrl: `${base}/dashboard/messages/${m.id}`,
        })
      }
      summary.scheduledTransitioned++
      void updated
    } catch (err) {
      summary.errors.push(`scheduled→pending ${m.id}: ${(err as Error).message}`)
    }
  }

  // ---- Job 2: pending_approval → either auto-send or reminder ----
  const pending = await prisma.message.findMany({
    where: {
      state: 'pending_approval',
      user: { deceasedAt: null },
    },
    include: { user: { select: { name: true, email: true } } },
  })
  for (const m of pending) {
    try {
      const expires = m.approvalExpiresAt ?? approvalExpiryFrom(m.approvalPromptedAt ?? now)
      if (now >= expires) {
        // 14-day window elapsed → silence implies approve → send
        await deliverMessage(m.id)
        summary.approvalsAutoSent++
        continue
      }

      // Otherwise send a daily reminder if we haven't sent one today
      const remindersSent = m.approvalRemindersSent ?? 0
      const daysSincePrompt = Math.floor(
        (now.getTime() - (m.approvalPromptedAt ?? now).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Don't double-send on the same day; only send once per calendar day past day 0.
      if (daysSincePrompt >= 1 && remindersSent < daysSincePrompt && daysSincePrompt < APPROVAL_WINDOW_DAYS) {
        if (m.user.email && m.approvalToken) {
          const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.readywithlove.com'
          await sendApprovalPrompt({
            to: m.user.email,
            userFirstName: m.user.name ?? 'friend',
            recipientName: m.recipientName,
            triggerDateLabel: (m.triggerDate ?? now).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            approvalUrl: `${base}/api/messages/${m.id}/approve?token=${m.approvalToken}`,
            postponeUrl: `${base}/dashboard/messages/${m.id}/edit`,
            cancelUrl: `${base}/api/messages/${m.id}/archive?token=${m.approvalToken}`,
            viewUrl: `${base}/dashboard/messages/${m.id}`,
            isReminder: true,
            daysSincePrompt,
          })
          await prisma.message.update({
            where: { id: m.id },
            data: { approvalRemindersSent: daysSincePrompt },
          })
          summary.remindersSent++
        }
      }
    } catch (err) {
      summary.errors.push(`pending process ${m.id}: ${(err as Error).message}`)
    }
  }

  return summary
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const summary = await processMessages()
  return NextResponse.json({ ok: true, summary })
}
