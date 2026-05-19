// app/dashboard/contributions/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { AppNav } from '@/components/AppNav'
import { ConfirmDialog } from '@/components/ConfirmDialog'

/**
 * Zip 2c.4: Unified Contributions page.
 *
 * Replaces the split between /dashboard/messages?tab=received (feed) and
 * /dashboard/messages/invites (management). Both halves live here, scrollable
 * on the same page. The old URLs still work for deep links — this just gives
 * users a single place to think about "contributions" as a concept.
 *
 * Structure:
 *   1. Hero (chapter heading)
 *   2. Received feed (active + archived tabs)
 *   3. Invitations section (create form + active list)
 */

interface Contribution {
  id: string
  type: 'letter' | 'video' | 'photo' | 'story'
  contributorName: string
  contributorNote: string | null
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  viewedByUser: boolean
  archivedAt: string | null
  importedToTimelineItemId: string | null
  importedToTimelineDate: string | null
  createdAt: string
}

interface Invite {
  id: string
  token: string
  contributorName: string
  contributorEmail: string | null
  message: string | null
  expiresAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  useCount: number
  contributionCount: number
  createdAt: string
}

interface CreateResponse {
  invite: Invite
  inviteUrl: string
  email: { sent: boolean; skipped?: boolean; error?: string }
}

const TYPE_META: Record<Contribution['type'], { label: string; icon: string }> = {
  letter: { label: 'Letter', icon: '✎' },
  video: { label: 'Video', icon: '●' },
  photo: { label: 'Photo', icon: '◇' },
  story: { label: 'Story', icon: '❦' },
}

type FeedTab = 'active' | 'archived'

export default function ContributionsPage() {
  // Feed state
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [archivedContributions, setArchivedContributions] = useState<Contribution[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [feedTab, setFeedTab] = useState<FeedTab>('active')

  // Invite state
  const [invites, setInvites] = useState<Invite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(true)

  // Create invite form state
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [sendEmail, setSendEmail] = useState(false)
  const [lastCreated, setLastCreated] = useState<CreateResponse | null>(null)

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null)
  const [revoking, setRevoking] = useState(false)

  const refreshFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/contributions')
      if (res.ok) {
        const data = await res.json()
        setContributions(data.contributions)
      }
    } finally {
      setFeedLoading(false)
    }
  }, [])

  const refreshArchived = useCallback(async () => {
    setArchivedLoading(true)
    try {
      const res = await fetch('/api/contributions?archived=true')
      if (res.ok) {
        const data = await res.json()
        setArchivedContributions(data.contributions)
      }
    } finally {
      setArchivedLoading(false)
    }
  }, [])

  const refreshInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.invites)
      }
    } finally {
      setInvitesLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshFeed()
    refreshInvites()
  }, [refreshFeed, refreshInvites])

  useEffect(() => {
    if (feedTab === 'archived' && archivedContributions.length === 0 && !archivedLoading) {
      refreshArchived()
    }
  }, [feedTab, archivedContributions.length, archivedLoading, refreshArchived])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateError(null)
    setLastCreated(null)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName: name.trim(),
          contributorEmail: email.trim() || undefined,
          message: message.trim() || undefined,
          expiresInDays,
          sendEmail: sendEmail && !!email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not create invitation')
      }
      setLastCreated(data)
      setName('')
      setEmail('')
      setMessage('')
      setSendEmail(false)
      refreshInvites()
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/invites/${revokeTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        refreshInvites()
      }
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  const unviewedCount = contributions.filter((c) => !c.viewedByUser && !c.archivedAt).length

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#2c2416] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,111,58,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <AppNav />

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Chapter Two ·
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3 md:mb-4">
            Contributions
            <br />
            <span className="italic text-[#8b6f3a]">from loved ones.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Invite the people who shaped you to share what they remember.
            Their letters, videos, photos, and stories land here for you to keep.
          </p>
        </motion.div>

        {/* ── RECEIVED FEED ────────────────────────────────────────── */}
        <section className="mb-16 md:mb-24">
          <h2 className="font-serif text-2xl md:text-3xl mb-4 md:mb-6">
            What they&rsquo;ve sent
            {unviewedCount > 0 && (
              <span className="ml-3 text-sm md:text-base text-[#8b6f3a] italic font-light">
                {unviewedCount} new
              </span>
            )}
          </h2>

          {/* Sub-tabs */}
          <div className="border-b border-[#2c2416]/15 mb-6 flex gap-6 overflow-x-auto overflow-y-hidden">
            <SubTab active={feedTab === 'active'} onClick={() => setFeedTab('active')}>
              Active
            </SubTab>
            <SubTab active={feedTab === 'archived'} onClick={() => setFeedTab('archived')}>
              Archived
            </SubTab>
          </div>

          {feedTab === 'active' ? (
            feedLoading ? (
              <p className="font-serif italic text-[#5c4d2e]">Loading…</p>
            ) : contributions.length === 0 ? (
              <p className="font-serif italic text-[#5c4d2e]">
                Nothing yet. Send an invitation below to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {contributions
                  .filter((c) => !c.archivedAt)
                  .map((c) => (
                    <ContributionCard key={c.id} c={c} />
                  ))}
              </div>
            )
          ) : archivedLoading ? (
            <p className="font-serif italic text-[#5c4d2e]">Loading…</p>
          ) : archivedContributions.length === 0 ? (
            <p className="font-serif italic text-[#5c4d2e]">
              You haven&rsquo;t set aside anything yet.
            </p>
          ) : (
            <div className="space-y-4">
              {archivedContributions.map((c) => (
                <ContributionCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* ── INVITATIONS ─────────────────────────────────────────── */}
        <section>
          <h2 className="font-serif text-2xl md:text-3xl mb-4 md:mb-6">Invitations</h2>

          {/* Create form */}
          <form
            onSubmit={handleCreate}
            className="border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-6 md:p-8 mb-8"
          >
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-4">
              Send a new invitation
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                  Who is this for?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aunt Mary, or Mary Johnson"
                  required
                  className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 font-serif text-base"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                  Their email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mary@example.com"
                  className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 font-serif text-base"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                A note from you (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Something to let them know why you're reaching out…"
                rows={3}
                className="w-full bg-transparent border border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none p-3 font-serif text-base resize-y"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-5 items-end">
              <div>
                <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
                  Expires in
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 font-serif text-base"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#5c4d2e]">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  disabled={!email.trim()}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Email this invitation to them now.
                {!email.trim() && (
                  <span className="italic text-xs">(Enter an email above to enable.)</span>
                )}
              </label>
            </div>

            {createError && <p className="mb-4 text-sm text-[#c0392b] italic">{createError}</p>}

            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-[#2c2416] text-[#f5f1e8] px-6 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-40"
            >
              {creating ? 'Creating…' : 'Create invitation'}
            </button>

            {lastCreated && (
              <div className="mt-6 border-l-2 border-[#8b6f3a] pl-4 py-2">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] mb-1">Link created</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs bg-[#2c2416]/5 px-2 py-1 font-mono break-all flex-1">
                    {lastCreated.inviteUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyUrl(lastCreated.inviteUrl)}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
                  >
                    Copy
                  </button>
                </div>
                {lastCreated.email.sent && (
                  <p className="text-xs italic text-[#5c4d2e] mt-2">Email sent.</p>
                )}
                {lastCreated.email.error && (
                  <p className="text-xs italic text-[#c0392b] mt-2">
                    Email failed: {lastCreated.email.error}
                  </p>
                )}
              </div>
            )}
          </form>

          {/* Active invitations list */}
          <h3 className="font-serif text-xl md:text-2xl mb-4">Active invitations</h3>
          {invitesLoading ? (
            <p className="font-serif italic text-[#5c4d2e]">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="font-serif italic text-[#5c4d2e]">
              No invitations sent yet.
            </p>
          ) : (
            <div className="space-y-4">
              {invites.map((inv) => (
                <InviteCard
                  key={inv.id}
                  invite={inv}
                  onRevoke={() => setRevokeTarget(inv)}
                  onCopy={() => copyUrl(`${window.location.origin}/contribute/${inv.token}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!revokeTarget}
        title={`Revoke ${revokeTarget?.contributorName ?? ''}'s invitation?`}
        message={
          `They won't be able to send any more memories through this invitation. ` +
          `Their existing contributions stay with you.`
        }
        confirmLabel={revoking ? 'Revoking…' : 'Revoke'}
        cancelLabel="Keep active"
        tone="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}

function SubTab({
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
      className={`text-sm md:text-base pb-3 transition whitespace-nowrap ${
        active
          ? 'border-b-2 border-[#8b6f3a] text-[#2c2416]'
          : 'text-[#5c4d2e]/70 hover:text-[#2c2416]'
      }`}
    >
      {children}
    </button>
  )
}

function ContributionCard({ c }: { c: Contribution }) {
  const meta = TYPE_META[c.type]
  const preview = (() => {
    if (c.type === 'letter' || c.type === 'story') {
      const text = c.content ?? ''
      return text.slice(0, 140) + (text.length > 140 ? '…' : '')
    }
    if (c.type === 'video') return 'Video message'
    return 'Photo'
  })()
  const importedYear = c.importedToTimelineDate
    ? new Date(c.importedToTimelineDate).getFullYear()
    : null

  return (
    <Link
      href={`/dashboard/messages/contribution/${c.id}`}
      className="block border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-5 hover:border-[#2c2416]/30 transition relative"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]">
          <span className="text-base mr-1">{meta.icon}</span>
          {meta.label} from {c.contributorName}
        </p>
        <div className="flex items-center gap-2">
          {importedYear && (
            <span className="text-[10px] tracking-wide text-green-700 italic whitespace-nowrap">
              ✓ Added to {importedYear}
            </span>
          )}
          {!c.viewedByUser && !c.archivedAt && (
            <span className="w-2 h-2 rounded-full bg-[#c0392b]" aria-label="Unread" />
          )}
        </div>
      </div>
      {c.type === 'photo' && c.mediaUrl ? (
        <div className="my-2 max-h-32 overflow-hidden bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.mediaUrl} alt="" className="w-full max-h-32 object-cover" />
        </div>
      ) : (
        <p className="font-serif text-sm text-[#2c2416] line-clamp-2 italic">
          {preview}
        </p>
      )}
      <p className="text-[10px] italic text-[#5c4d2e]/60 mt-2">
        {new Date(c.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </Link>
  )
}

function InviteCard({
  invite,
  onRevoke,
  onCopy,
}: {
  invite: Invite
  onRevoke: () => void
  onCopy: () => void
}) {
  const isExpired = new Date(invite.expiresAt) < new Date()
  const isRevoked = !!invite.revokedAt
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/contribute/${invite.token}`
      : `/contribute/${invite.token}`
  const expiresInDays = Math.max(
    0,
    Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]">For</p>
          <p className="font-serif text-lg md:text-xl">{invite.contributorName}</p>
          {invite.contributorEmail && (
            <p className="text-xs italic text-[#5c4d2e]">{invite.contributorEmail}</p>
          )}
        </div>
        <p
          className={`text-xs italic ${
            isRevoked ? 'text-[#c0392b]' :
            isExpired ? 'text-[#5c4d2e]' :
            invite.contributionCount > 0 ? 'text-green-700' : 'text-[#5c4d2e]'
          }`}
        >
          {isRevoked
            ? 'Revoked'
            : isExpired
              ? 'Expired'
              : invite.contributionCount > 0
                ? `${invite.contributionCount} ${invite.contributionCount === 1 ? 'memory' : 'memories'} received`
                : 'No contributions yet'}
        </p>
      </div>
      <p className="text-xs italic text-[#5c4d2e]/70 mb-3">
        {isExpired
          ? `Expired ${formatRelativeShort(invite.expiresAt)}`
          : `Expires in ${expiresInDays} day${expiresInDays === 1 ? '' : 's'}`}
        {' · '}
        Created {formatRelativeShort(invite.createdAt)}
      </p>
      {!isRevoked && !isExpired && (
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-[#2c2416]/5 px-2 py-1 font-mono break-all flex-1 min-w-0">
            {inviteUrl}
          </code>
          <button
            onClick={onCopy}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
          >
            Copy
          </button>
          <button
            onClick={onRevoke}
            className="text-[10px] tracking-[0.2em] uppercase text-[#c0392b] hover:underline transition"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  )
}

function formatRelativeShort(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const absMs = Math.abs(diffMs)
  const hr = Math.floor(absMs / (1000 * 60 * 60))
  if (hr < 1) return diffMs > 0 ? 'just now' : 'soon'
  if (hr < 24) return diffMs > 0 ? `${hr} hr ago` : `in ${hr} hr`
  const days = Math.floor(hr / 24)
  return diffMs > 0 ? `${days} day${days === 1 ? '' : 's'} ago` : `in ${days} day${days === 1 ? '' : 's'}`
}
