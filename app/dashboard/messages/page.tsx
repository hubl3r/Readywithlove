// app/dashboard/messages/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import { STATE_LABELS, type MessageState } from '@/lib/messageHelpers'
import { formatMediumDate } from '@/lib/dateFormat'

interface MessageRow {
  id: string
  recipientName: string
  recipientEmail: string | null
  type: 'letter' | 'video' | 'photo' | 'story'
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

interface ContributionRow {
  id: string
  type: 'letter' | 'video' | 'photo' | 'story'
  contributorName: string
  contributorEmail: string | null
  contributorNote: string | null
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  viewedByUser: boolean
  archivedAt: string | null
  importedToTimelineItemId: string | null
  createdAt: string
}

type TabKey = 'leaving' | 'received' | 'archived'

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagesInner />
    </Suspense>
  )
}

function MessagesFallback() {
  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416]">
      <AppNav />
      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <p className="font-serif italic text-[#5c4d2e]">Loading your shoebox…</p>
      </main>
    </div>
  )
}

function MessagesInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab: TabKey = (() => {
    const t = searchParams.get('tab')
    if (t === 'received') return 'received'
    if (t === 'archived') return 'archived'
    return 'leaving'
  })()

  const [tab, setTab] = useState<TabKey>(initialTab)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [contributions, setContributions] = useState<ContributionRow[]>([])
  const [archivedContributions, setArchivedContributions] = useState<ContributionRow[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadingContributions, setLoadingContributions] = useState(true)
  const [loadingArchived, setLoadingArchived] = useState(false)

  // Wraps setTab + URL sync. Keeps the URL the source of truth so the
  // current tab is shareable and survives reloads.
  const switchTab = (next: TabKey) => {
    setTab(next)
    const query =
      next === 'received' ? '?tab=received' :
      next === 'archived' ? '?tab=archived' :
                            ''
    router.replace(`/dashboard/messages${query}`)
  }

  useEffect(() => {
    const nextTab = (() => {
      const t = searchParams.get('tab')
      if (t === 'received') return 'received'
      if (t === 'archived') return 'archived'
      return 'leaving'
    })()
    setTab(nextTab)
  }, [searchParams])

  // Load messages once
  useEffect(() => {
    fetch('/api/messages')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMessages(data.messages)
      })
      .finally(() => setLoadingMessages(false))
  }, [])

  // Load active contributions once
  useEffect(() => {
    fetch('/api/contributions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setContributions(data.contributions)
      })
      .finally(() => setLoadingContributions(false))
  }, [])

  // Load archived contributions lazily on first archived-tab visit
  useEffect(() => {
    if (tab !== 'archived') return
    // Skip if we already loaded or are mid-load
    if (loadingArchived) return
    if (archivedContributions.length > 0) return
    setLoadingArchived(true)
    fetch('/api/contributions?archived=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setArchivedContributions(data.contributions)
      })
      .finally(() => setLoadingArchived(false))
  }, [tab, archivedContributions.length, loadingArchived])

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
            Letters, videos, photos, and stories to be delivered when the
            time is right. A shoebox for the things you want them to know.
          </p>
        </motion.div>

        <div className="border-b border-[#2c2416]/15 mb-8 md:mb-10 flex gap-6 md:gap-10 overflow-x-auto overflow-y-hidden">
          <TabButton active={tab === 'leaving'} onClick={() => switchTab('leaving')}>
            Letters I&apos;m leaving
          </TabButton>
          <TabButton active={tab === 'received'} onClick={() => switchTab('received')}>
            From others
            {!loadingContributions && contributions.filter((c) => !c.viewedByUser).length > 0 && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#c0392b] align-middle" />
            )}
          </TabButton>
          <TabButton active={tab === 'archived'} onClick={() => switchTab('archived')}>
            Archived
          </TabButton>
        </div>

        {tab === 'leaving' && (
          <LeavingTab messages={messages} groups={groups} loading={loadingMessages} />
        )}
        {tab === 'received' && (
          <ReceivedTab
            contributions={contributions.filter((c) => !c.archivedAt)}
            loading={loadingContributions}
          />
        )}
        {tab === 'archived' && (
          <ArchivedTab
            archivedMessages={groups.archived}
            archivedContributions={archivedContributions}
            loadingMessages={loadingMessages}
            loadingContributions={loadingArchived}
          />
        )}
      </main>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Tabs
// ───────────────────────────────────────────────────────────

function LeavingTab({
  messages,
  groups,
  loading,
}: {
  messages: MessageRow[]
  groups: Record<string, MessageRow[]>
  loading: boolean
}) {
  return (
    <>
      {/* 2x2 type picker — start a new outgoing message. Matches the
          contributor flow visually so users see the same affordance for
          "pick a way to express this" on both sides. */}
      <NewMessagePicker />

      {loading ? (
        <p className="font-serif italic text-[#5c4d2e]">Loading your shoebox…</p>
      ) : messages.length === 0 ? (
        <EmptyShoebox />
      ) : (
        <div className="space-y-12 md:space-y-16">
          <Section title="Awaiting your ok" rows={groups.pending_approval} highlight />
          <Section title="Scheduled" rows={groups.scheduled} />
          <Section title="Drafts" rows={groups.drafting} />
          <Section title="Delivered" rows={groups.sent} muted />
        </div>
      )}
    </>
  )
}

const NEW_MESSAGE_TYPES = [
  { id: 'letter', label: 'A letter', blurb: 'Write a note, addressed to them.',       icon: '✎' },
  { id: 'video',  label: 'A video',  blurb: 'Record or upload — speak in your voice.', icon: '●' },
  { id: 'photo',  label: 'A photo',  blurb: 'Share a picture worth keeping.',           icon: '◇' },
  { id: 'story',  label: 'A story',  blurb: 'A memory you’d like to preserve.',         icon: '❦' },
] as const

function NewMessagePicker() {
  return (
    <div className="mb-12 md:mb-16">
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-4 md:mb-5">
        Leave a new message
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {NEW_MESSAGE_TYPES.map((opt) => (
          <Link
            key={opt.id}
            href={`/dashboard/messages/new?type=${opt.id}`}
            className="text-left border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md hover:border-[#8b6f3a] hover:bg-[#8b6f3a]/5 transition p-5 md:p-6 group"
          >
            <p className="text-2xl md:text-3xl font-serif text-[#8b6f3a] mb-2">
              {opt.icon}
            </p>
            <p className="font-serif text-xl md:text-2xl text-[#2c2416] mb-1 group-hover:text-[#8b6f3a] transition">
              {opt.label}
            </p>
            <p className="text-xs md:text-sm text-[#5c4d2e] font-light">{opt.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ReceivedTab({
  contributions,
  loading,
}: {
  contributions: ContributionRow[]
  loading: boolean
}) {
  if (loading) {
    return <p className="font-serif italic text-[#5c4d2e]">Loading…</p>
  }
  if (contributions.length === 0) {
    return (
      <div className="space-y-8 md:space-y-10">
        <p className="font-serif italic text-[#5c4d2e] text-base md:text-lg max-w-2xl">
          Invite loved ones to share a memory, a story, or a few words you can
          carry forward. Their contributions will appear here.
        </p>

        <div className="border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-6 md:p-8 max-w-2xl">
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
            To begin
          </p>
          <h3 className="font-serif text-2xl md:text-3xl mb-2">
            Send your first <span className="italic text-[#8b6f3a]">invitation</span>.
          </h3>
          <p className="text-sm md:text-base text-[#5c4d2e] font-light mb-5">
            Create a link to share with someone — by email, by text, however
            feels right. No account needed for them.
          </p>
          <Link
            href="/dashboard/messages/invites"
            className="inline-flex items-center gap-2 bg-[#2c2416] text-[#f5f1e8] px-5 md:px-6 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
          >
            Manage invitations
            <span>→</span>
          </Link>
        </div>
      </div>
    )
  }

  const unviewed = contributions.filter((c) => !c.viewedByUser)
  const viewed = contributions.filter((c) => c.viewedByUser)

  return (
    <div className="space-y-10 md:space-y-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
        <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] max-w-2xl">
          Memories that have been shared with you.
        </p>
        <Link
          href="/dashboard/messages/invites"
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          Manage invitations →
        </Link>
      </div>

      <ContributionSection
        title="New"
        rows={unviewed}
        highlight
        emptyHint="All caught up. Nothing new since you last looked."
      />
      <ContributionSection title="Already seen" rows={viewed} muted />
    </div>
  )
}

function ArchivedTab({
  archivedMessages,
  archivedContributions,
  loadingMessages,
  loadingContributions,
}: {
  archivedMessages: MessageRow[]
  archivedContributions: ContributionRow[]
  loadingMessages: boolean
  loadingContributions: boolean
}) {
  const empty =
    !loadingMessages &&
    !loadingContributions &&
    archivedMessages.length === 0 &&
    archivedContributions.length === 0

  if (empty) {
    return (
      <div className="text-center py-16 md:py-24 border border-[#2c2416]/20 bg-[#f5f1e8]/40 backdrop-blur-md">
        <p className="font-serif text-2xl md:text-3xl italic text-[#5c4d2e] mb-3">
          Nothing archived.
        </p>
        <p className="text-sm md:text-base text-[#8b6f3a] max-w-md mx-auto px-5">
          Things you set aside will live here. They aren’t lost — just out of the way.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12 md:space-y-16">
      <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] max-w-2xl">
        Letters and contributions you’ve set aside.
      </p>
      <Section title="Archived letters" rows={archivedMessages} muted />
      <ContributionSection
        title="Archived contributions"
        rows={archivedContributions}
        muted
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Generic UI bits
// ───────────────────────────────────────────────────────────

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
      className={`pb-3 -mb-px border-b-2 font-serif text-base md:text-lg transition whitespace-nowrap ${
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
  const trigger = m.triggerDate ? formatMediumDate(m.triggerDate) : null

  // Per-type title fallback for unnamed drafts. Recipient name always
  // wins if present, then subject, then a generated default.
  const title = (() => {
    if (m.recipientName) return `To ${m.recipientName}`
    if (m.subject) return m.subject
    if ((m.type === 'letter' || m.type === 'story') && m.content) {
      const words = m.content.trim().split(/\s+/).slice(0, 6).join(' ')
      return words ? `${words}…` : 'Untitled draft'
    }
    if (m.type === 'video' && m.mediaUrl) return 'Untitled video'
    if (m.type === 'photo' && m.mediaUrl) return 'Untitled photo'
    return 'Untitled draft'
  })()

  const startedLabel =
    m.state === 'drafting' ? `Started ${relativeTime(m.createdAt)}` : null

  const typeLabel =
    m.type === 'letter' ? 'Letter' :
    m.type === 'video'  ? 'Video'  :
    m.type === 'photo'  ? 'Photo'  :
                          'Story'

  const preview = (() => {
    if (m.type === 'letter' || m.type === 'story') {
      return (m.content ?? '').slice(0, 140)
    }
    if (m.type === 'video') {
      return m.mediaDurationSec
        ? `Video · ${formatDuration(m.mediaDurationSec)}`
        : m.mediaUrl
          ? 'Video saved'
          : 'No recording yet'
    }
    // photo
    return m.mediaUrl ? 'Photo saved' : 'No photo yet'
  })()

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
          {typeLabel} · <span className={toneColor}>{label.label}</span>
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
      {/* For photo type, show a small thumbnail inline */}
      {m.type === 'photo' && m.mediaUrl && (
        <div className="mb-2 -mx-1 max-h-32 overflow-hidden bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.mediaUrl}
            alt={title}
            className="block w-full max-h-32 object-cover"
          />
        </div>
      )}
      <p className="text-sm text-[#5c4d2e] line-clamp-2 font-light">
        {preview || <span className="italic opacity-60">Empty — open to begin</span>}
      </p>
    </Link>
  )
}

// ───────────────────────────────────────────────────────────
// Contribution cards
// ───────────────────────────────────────────────────────────

function ContributionSection({
  title,
  rows,
  highlight,
  muted,
  emptyHint,
}: {
  title: string
  rows: ContributionRow[]
  highlight?: boolean
  muted?: boolean
  emptyHint?: string
}) {
  if (rows.length === 0) {
    if (!emptyHint) return null
    return (
      <section>
        <h2
          className={`font-serif text-2xl md:text-3xl mb-5 ${
            highlight ? 'text-[#c0392b]' : 'text-[#2c2416]'
          } ${muted ? 'opacity-70' : ''}`}
        >
          {title}
        </h2>
        <p className="font-serif italic text-[#5c4d2e]">{emptyHint}</p>
      </section>
    )
  }
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
        {rows.map((c) => (
          <ContributionCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  )
}

function ContributionCard({ c }: { c: ContributionRow }) {
  const typeLabel =
    c.type === 'letter' ? 'Letter' :
    c.type === 'video'  ? 'Video'  :
    c.type === 'photo'  ? 'Photo'  :
                          'Story'

  const typeIcon =
    c.type === 'letter' ? '✎' :
    c.type === 'video'  ? '●' :
    c.type === 'photo'  ? '◇' :
                          '❦'

  const preview = (() => {
    if (c.type === 'letter' || c.type === 'story') {
      return (c.content ?? '').slice(0, 140)
    }
    if (c.type === 'video') {
      return c.mediaDurationSec ? `${formatDuration(c.mediaDurationSec)}` : 'Video'
    }
    return 'Photo'
  })()

  return (
    <Link
      href={`/dashboard/messages/contribution/${c.id}`}
      className="block bg-[#f5f1e8]/80 backdrop-blur-md border border-[#2c2416]/10 p-5 md:p-6 hover:bg-[#ede5d3]/80 transition group relative"
    >
      {!c.viewedByUser && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#c0392b]"
          aria-label="Not yet viewed"
        />
      )}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a]">
          <span className="text-base mr-1">{typeIcon}</span>
          {typeLabel} · from{' '}
          <span className="italic text-[#5c4d2e]">{c.contributorName}</span>
        </p>
      </div>
      {/* For photo type, show a thumbnail */}
      {c.type === 'photo' && c.mediaUrl && (
        <div className="mb-3 -mx-1 max-h-48 overflow-hidden bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.mediaUrl}
            alt={`From ${c.contributorName}`}
            className="block w-full max-h-48 object-cover"
          />
        </div>
      )}
      <p className="text-sm md:text-base text-[#5c4d2e] line-clamp-2 font-light mb-2">
        {preview || <span className="italic opacity-60">Open to view</span>}
      </p>
      <p className="text-[11px] italic text-[#8b6f3a]/70">
        Received {relativeTime(c.createdAt)}
        {c.importedToTimelineItemId && (
          <span className="ml-2">· in your timeline</span>
        )}
      </p>
    </Link>
  )
}

// ───────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────

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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}
