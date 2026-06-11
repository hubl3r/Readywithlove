// app/api/settings/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/userBootstrap'

const PAGE_TURN_STYLES = ['fade', 'curl'] as const
const FONT_SCALES = ['small', 'normal', 'large', 'xlarge'] as const

// preferredVoiceURI is a Web Speech API string. We don't enumerate the
// allowed values (impossible — varies by user's installed voices), but we
// cap length so it can't be used as a bag-of-bytes column.
const MAX_VOICE_URI_LENGTH = 256

// The user's note-to-whoever-opens-this on Arrangements. Generous cap;
// this is a personal message, not a database firehose, and 10k characters
// is well beyond what anyone would write while still bounded.
const MAX_FINAL_MESSAGE_LENGTH = 10_000

// GET — return settings, creating defaults on first read
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })

  return NextResponse.json(settings)
}

// PATCH — update one or more settings fields.
//
// Zip 2c.3: adds `preferredVoiceURI` (string|null). Cleared when sent as
// null or empty string; stored otherwise (up to MAX_VOICE_URI_LENGTH).
//
// Zip 2d.1.2: adds `arrFinalMessage` (string|null). Same null/empty
// clearing pattern. Capped at 10k characters.
export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)

  const body = await request.json()

  // Whitelist + validate each field. Never trust client-supplied enum values.
  const data: Record<string, unknown> = {}
  if (body.pageTurnStyle !== undefined) {
    if (!PAGE_TURN_STYLES.includes(body.pageTurnStyle)) {
      return NextResponse.json({ error: 'Invalid pageTurnStyle' }, { status: 400 })
    }
    data.pageTurnStyle = body.pageTurnStyle
  }
  if (body.fontScale !== undefined) {
    if (!FONT_SCALES.includes(body.fontScale)) {
      return NextResponse.json({ error: 'Invalid fontScale' }, { status: 400 })
    }
    data.fontScale = body.fontScale
  }
  if (typeof body.highContrast === 'boolean') data.highContrast = body.highContrast
  if (typeof body.ttsEnabled === 'boolean') data.ttsEnabled = body.ttsEnabled
  if (typeof body.sttEnabled === 'boolean') data.sttEnabled = body.sttEnabled
  if (typeof body.reducedMotion === 'boolean') data.reducedMotion = body.reducedMotion
  // Zip 2c.6: opt out of new-contribution emails
  if (typeof body.notifyOnContribution === 'boolean') {
    data.notifyOnContribution = body.notifyOnContribution
  }

  if (body.preferredVoiceURI !== undefined) {
    if (body.preferredVoiceURI === null || body.preferredVoiceURI === '') {
      data.preferredVoiceURI = null
    } else if (typeof body.preferredVoiceURI === 'string') {
      if (body.preferredVoiceURI.length > MAX_VOICE_URI_LENGTH) {
        return NextResponse.json(
          { error: 'preferredVoiceURI too long' },
          { status: 400 }
        )
      }
      data.preferredVoiceURI = body.preferredVoiceURI
    } else {
      return NextResponse.json(
        { error: 'Invalid preferredVoiceURI' },
        { status: 400 }
      )
    }
  }

  // Zip 2d.1.2: arrFinalMessage. Same null/empty clearing pattern as
  // preferredVoiceURI. Trimmed before length check so trailing whitespace
  // doesn't push a borderline message over the cap.
  if (body.arrFinalMessage !== undefined) {
    if (body.arrFinalMessage === null || body.arrFinalMessage === '') {
      data.arrFinalMessage = null
    } else if (typeof body.arrFinalMessage === 'string') {
      const trimmed = body.arrFinalMessage.trim()
      if (trimmed.length === 0) {
        data.arrFinalMessage = null
      } else if (trimmed.length > MAX_FINAL_MESSAGE_LENGTH) {
        return NextResponse.json(
          { error: 'arrFinalMessage too long' },
          { status: 400 }
        )
      } else {
        data.arrFinalMessage = trimmed
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid arrFinalMessage' },
        { status: 400 }
      )
    }
  }

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })

  return NextResponse.json(settings)
}
