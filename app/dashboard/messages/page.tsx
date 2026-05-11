// app/dashboard/messages/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { AppNav } from '@/components/AppNav'
import { STATE_LABELS, type MessageState } from '@/lib/messageHelpers'

interface MessageRow {
  id: string
  recipientName: string
  recipientEmail: string | null
  type: 'letter' | 'video'
  subject: string | null
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  triggerDate: string | null
  state: MessageState
  sentAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

type TabKey = 'leaving' | 'received'

export default function MessagesPage() {
  const [tab, setTab] = useState<TabKey>('leaving')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMessages(data.messages)
      })
      .finally(() => setLoading(false))
  }, [])

  const groups: Record<string, MessageRow[]> = {
    pending_approval: [],
    scheduled: [],
    drafting: [],
    sent: [],
    archived: [],
  }
  for (const m of messages) {
    if (groups[m.state]) groups[m.state].push(m)
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 200, 0], y: [0, 150, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <AppNav />

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10 md:mb-14"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Chapter Two ·
          </p>
          <h1 className="font-serif text-4xl md:text-7xl leading-tight mb-3 md:mb-4">
            Letters across
            <br />
            <span className="italic text-[#8b6f3a]">time.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Write letters or record videos to be delivered when the time is right.
            A shoebox for the things you want them to know.
          </p>

          <div className="mt-8 md:mt-10 flex flex-wrap gap-3">
            <Link
              href="/dashboard/messages/new?type=letter"
              className="group inline-flex items-center gap-3 bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-3 md:py-4 hover:bg-[#8b6f3a] transition"
            >
              <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Write a letter</span>
              <span className="text-lg group-hover:translate-x-1 transition">+</span>
            </Link>
            <Link
              href="/dashboard/messages/new?type=video"
              className="group inline-flex items-center gap-3 border border-[#2c2416] text-[#2c2416] px-6 md:px-8 py-3 md:py-4 hover:bg-[#2c2416] hover:text-[#f5f1e8] transition"
            >
              <span className="tracking-[0.2em] uppercase text-xs md:text-sm">Record a video</span>
              <span className="group-hover:translate-x-1 transition">●</span>
            </Link>
          </div>
        </motion.div>

        <div className="border-b border-[#2c2416]/15 mb-8 md:mb-10 flex gap-6 md:gap-10">
          <TabButton active={tab === 'leaving'} onClick={() => setTab('leaving')}>
            Letters I&apos;m leaving
          </TabButton>
          <TabButton active={tab === 'received'} onClick={() => setTab('received')}>
            From others
          </TabButton>
        </div>

        {tab === 'received' ? (
          <p className="font-serif italic text-[#5c4d2e] text-base md:text-lg">
            When you invite loved ones to share memories, their contributions
            will appear here.{' '}
            <span className="text-[#8b6f3a]/70">— coming in the next update.</span>
          </p>
        ) : loading ? (
          <p className="font-serif italic text-[#5c4d2e]">Loading your shoebox…</p>
        ) : messages.length === 0 ? (
          <EmptyShoebox />
        ) : (
          <div className="space-y-12 md:space-y-16">
            <Section title="Awaiting your ok" rows={groups.pending_approval} highlight />
            <Section title="Scheduled" rows={groups.scheduled} />
            <Section title="Drafts" rows={groups.drafting} />
            <Section title="Delivered" rows={groups.sent} muted />
            <Section title="Archived" rows={groups.archived} muted />
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px border-b-2 font-serif text-base md:text-lg transition ${
        active
          ? 'border-[#8b6f3a] text-[#2c2416]'
          : 'border-transparent text-[#5c4d2e]/60 hover:text-[#2c2416]'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyShoebox() {
  return (
    <div className="text-center py-16 md:py-24 border border-[#2c2416]/20 bg-[#f5f1e8]/40 backdrop-blur-md">
      <p className="font-serif text-2xl md:text-3xl italic text-[#5c4d2e] mb-4">
        Nothing in the shoebox yet.
      </p>
      <p className="text-sm md:text-base text-[#8b6f3a] max-w-md mx-auto px-5">
        Start with a single letter or a short video. Even a few sentences are
        a gift.
      </p>
    </div>
  )
}

function Section({
  title,
  rows,
  highlight,
  muted,
}: {
  title: string
  rows: MessageRow[]
  highlight?: boolean
  muted?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <h2
        className={`font-serif text-2xl md:text-3xl mb-5 ${
          highlight ? 'text-[#c0392b]' : 'text-[#2c2416]'
        } ${muted ? 'opacity-70' : ''}`}
      >
        {title}{' '}
        <span className="text-[#8b6f3a] text-base md:text-lg italic">· {rows.length}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {rows.map((m) => (
          <MessageCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  )
}

function MessageCard({ m }: { m: MessageRow }) {
  const label = STATE_LABELS[m.state]
  const trigger = m.triggerDate
    ? new Date(m.triggerDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Build a meaningful title:
  // 1. "To [Name]" if recipient set
  // 2. Else "[Subject]" if subject set
  // 3. Else first 6 words of body (for letters) or "Untitled draft" (for video)
  // 4. Always fall back to "Untitled draft"
  const title = (() => {
    if (m.recipientName) return `To ${m.recipientName}`
    if (m.subject) return m.subject
    if (m.type === 'letter' && m.content) {
      const words = m.content.trim().split(/\s+/).slice(0, 6).join(' ')
      return words ? `${words}…` : 'Untitled draft'
    }
    if (m.type === 'video' && m.mediaUrl) return 'Untitled video'
    return 'Untitled draft'
  })()

  // For drafts, show "Started [relative time]" subtitle
  const startedLabel =
    m.state === 'drafting' ? `Started ${relativeTime(m.createdAt)}` : null

  const preview = m.type === 'letter'
    ? (m.content ?? '').slice(0, 140)
    : m.mediaDurationSec
      ? `Video · ${formatDuration(m.mediaDurationSec)}`
      : m.mediaUrl
        ? 'Video saved'
        : 'No recording yet'

  const toneColor =
    label.tone === 'danger'
      ? 'text-[#c0392b]'
      : label.tone === 'warm'
        ? 'text-[#8b6f3a]'
        : label.tone === 'success'
          ? 'text-green-700'
          : 'text-[#5c4d2e]'

  return (
    <Link
      href={`/dashboard/messages/${m.id}`}
      className="block bg-[#f5f1e8]/80 backdrop-blur-md border border-[#2c2416]/10 p-5 md:p-6 hover:bg-[#ede5d3]/80 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a]">
          {m.type === 'letter' ? 'Letter' : 'Video'} ·{' '}
          <span className={toneColor}>{label.label}</span>
        </p>
        {trigger && (
          <p className="text-[10px] md:text-xs tracking-wide italic text-[#5c4d2e]/70">
            {trigger}
          </p>
        )}
      </div>
      <h3 className="font-serif text-xl md:text-2xl text-[#2c2416] mb-1">
        {title}
      </h3>
      {m.subject && m.recipientName && (
        <p className="font-serif italic text-[#8b6f3a] text-sm mb-2">{m.subject}</p>
      )}
      {startedLabel && (
        <p className="text-[11px] italic text-[#8b6f3a]/70 mb-1.5">{startedLabel}</p>
      )}
      <p className="text-sm text-[#5c4d2e] line-clamp-2 font-light">
        {preview || <span className="italic opacity-60">Empty — open to begin</span>}
      </p>
    </Link>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 60) return 'just now'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  // Past a week, show the date
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}
