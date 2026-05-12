// app/contribute/[token]/thanks/ThanksList.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import {
  computeLockStatus,
  describeLockReason,
  formatTimeRemaining,
  type LockReason,
} from '@/lib/contributionLock'

interface Contribution {
  id: string
  type: 'letter' | 'video' | 'photo' | 'story'
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  contributorNote: string | null
  viewedByUser: boolean
  createdAt: string
  locked: boolean
  lockReason: LockReason
  msRemaining: number
}

const TYPE_META: Record<Contribution['type'], { label: string; icon: string }> = {
  letter: { label: 'Letter', icon: '✎' },
  video: { label: 'Video', icon: '●' },
  photo: { label: 'Photo', icon: '◇' },
  story: { label: 'Story', icon: '❦' },
}

/**
 * Renders the list of contributions made via this token, with a live
 * countdown until each one locks. We re-compute lock status on the client
 * once a minute (and again on focus) — the server's computed value is the
 * initial snapshot, but the timer ticks down without server round-trips.
 *
 * When a contribution crosses the lock boundary client-side, the UI
 * silently updates to show the lock badge. If the user tries to edit a
 * contribution that's locked server-side (e.g. owner just viewed it), the
 * detail page handles the rejection gracefully — see /sent/[id] route.
 */
export function ThanksList({
  token,
  inviterName: _inviterName,
}: {
  token: string
  inviterName: string
}) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const tickRef = useRef<number | null>(null)

  const refresh = async () => {
    try {
      const res = await fetch(`/api/contributions/by-token/${token}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not load your submissions')
      }
      const data = await res.json()
      setContributions(data.contributions)
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Tick once a minute to refresh countdown labels + re-check lock status.
  // Also re-tick on visibilitychange so a user who returns to the tab
  // doesn't see stale countdowns.
  useEffect(() => {
    const tick = () => setNow(new Date())
    tickRef.current = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (loading) {
    return <p className="font-serif italic text-[#5c4d2e] text-center">Loading what you’ve sent…</p>
  }
  if (errorMsg) {
    return <p className="font-serif italic text-[#c0392b] text-center">{errorMsg}</p>
  }
  if (contributions.length === 0) {
    return null
  }

  return (
    <div>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] text-center mb-6 md:mb-8">
        What you’ve sent
      </p>
      <div className="space-y-4 md:space-y-5">
        {contributions.map((c) => (
          <ThanksCard key={c.id} contribution={c} token={token} now={now} />
        ))}
      </div>
    </div>
  )
}

function ThanksCard({
  contribution,
  token,
  now,
}: {
  contribution: Contribution
  token: string
  now: Date
}) {
  // Re-derive lock status on the client every tick using the same fn as
  // the server. This keeps the countdown live without re-fetching.
  const liveLock = computeLockStatus(
    contribution.createdAt,
    contribution.viewedByUser,
    now
  )

  const meta = TYPE_META[contribution.type]
  const preview = (() => {
    if (contribution.type === 'letter' || contribution.type === 'story') {
      return (contribution.content ?? '').slice(0, 160) +
        ((contribution.content?.length ?? 0) > 160 ? '…' : '')
    }
    if (contribution.type === 'video') {
      return contribution.mediaDurationSec
        ? `Video · ${formatDuration(contribution.mediaDurationSec)}`
        : 'Video'
    }
    return 'Photo'
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-5 md:p-6"
    >
      {/* Top row: type + lock/countdown */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a]">
          <span className="text-base mr-1">{meta.icon}</span>
          {meta.label}
          <span className="text-[#5c4d2e]/60 ml-2">
            · Sent {formatRelative(contribution.createdAt, now)}
          </span>
        </p>
        <LockOrTimer lock={liveLock} />
      </div>

      {/* Preview content */}
      {contribution.type === 'photo' && contribution.mediaUrl ? (
        <div className="mb-3 max-h-40 overflow-hidden bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contribution.mediaUrl}
            alt="Your contribution"
            className="block w-full max-h-40 object-cover"
          />
        </div>
      ) : (
        <p className="font-serif text-sm md:text-base text-[#2c2416] line-clamp-2 mb-3 italic">
          {preview}
        </p>
      )}

      {/* Footer: review link */}
      <div className="flex justify-end">
        <Link
          href={`/contribute/${token}/sent/${contribution.id}`}
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          Review →
        </Link>
      </div>
    </motion.div>
  )
}

function LockOrTimer({
  lock,
}: {
  lock: ReturnType<typeof computeLockStatus>
}) {
  if (lock.locked) {
    return (
      <p
        className="text-[10px] md:text-xs tracking-wide text-[#5c4d2e]/70 italic flex items-center gap-1.5"
        title={describeLockReason(lock.reason)}
      >
        <LockIcon />
        {describeLockReason(lock.reason)}
      </p>
    )
  }
  return (
    <p
      className="text-[10px] md:text-xs tracking-wide text-[#8b6f3a] italic flex items-center gap-1.5"
      title="You can edit or delete this until the timer runs out, or until it’s viewed by the recipient."
    >
      <ClockIcon />
      {formatTimeRemaining(lock.msRemaining)}
    </p>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3 h-3 md:w-3.5 md:h-3.5"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3 h-3 md:w-3.5 md:h-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function formatRelative(iso: string, now: Date): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((now.getTime() - then) / 1000))
  if (diffSec < 60) return 'just now'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const days = Math.floor(hr / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
