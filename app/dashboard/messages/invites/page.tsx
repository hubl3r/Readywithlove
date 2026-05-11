// app/dashboard/messages/invites/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { AppNav } from '@/components/AppNav'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
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

  const refresh = async () => {
    try {
      const res = await fetch('/api/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.invites)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || creating) return
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
          sendEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not create invitation')
      }
      setLastCreated(data as CreateResponse)
      setInvites((prev) => [data.invite, ...prev])
      // Reset form fields (but keep dialog flow until user dismisses)
      setName('')
      setEmail('')
      setMessage('')
      setSendEmail(false)
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
      const res = await fetch(`/api/invites/${revokeTarget.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setInvites((prev) =>
          prev.map((i) =>
            i.id === revokeTarget.id
              ? { ...i, revokedAt: new Date().toISOString() }
              : i
          )
        )
      }
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
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
        <Link
          href="/dashboard/messages?tab=received"
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          ← Back to the shoebox
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 md:mt-8 mb-10 md:mb-14"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            · Invitations ·
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3 md:mb-4">
            Invite someone to <span className="italic text-[#8b6f3a]">share.</span>
          </h1>
          <p className="text-base md:text-lg text-[#5c4d2e] font-light max-w-2xl">
            Create a link to send to a loved one. They’ll be able to leave you
            a letter, a video, a photo, or a memory — no account needed.
          </p>
        </motion.div>

        {/* Create form */}
        <section className="border border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md p-6 md:p-8 mb-10 md:mb-14">
          <h2 className="font-serif text-2xl md:text-3xl mb-5 md:mb-6">
            New invitation
          </h2>

          <form onSubmit={handleCreate} className="space-y-5 md:space-y-6">
            <div>
              <label className="block text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                Who is this for?
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aunt Mary, or Mary Johnson"
                required
                className="w-full bg-[#f5f1e8] border border-[#2c2416]/20 px-4 py-3 font-serif text-base md:text-lg text-[#2c2416] placeholder:italic placeholder:text-[#5c4d2e]/50 focus:border-[#8b6f3a] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                A note from you (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Something to let them know why you’re reaching out…"
                className="w-full bg-[#f5f1e8] border border-[#2c2416]/20 px-4 py-3 font-serif text-base md:text-lg text-[#2c2416] placeholder:italic placeholder:text-[#5c4d2e]/50 focus:border-[#8b6f3a] focus:outline-none transition resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label className="block text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                  Expires in
                </label>
                <ThemedSelect
                  value={String(expiresInDays)}
                  onChange={(v) => setExpiresInDays(Number(v))}
                  options={[
                    { value: '7', label: '7 days' },
                    { value: '14', label: '14 days' },
                    { value: '30', label: '30 days' },
                    { value: '60', label: '60 days' },
                    { value: '90', label: '90 days' },
                    { value: '180', label: '6 months' },
                    { value: '365', label: '1 year' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                  Their email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mary@example.com"
                  className="w-full bg-[#f5f1e8] border border-[#2c2416]/20 px-4 py-3 font-serif text-base md:text-lg text-[#2c2416] placeholder:italic placeholder:text-[#5c4d2e]/50 focus:border-[#8b6f3a] focus:outline-none transition"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={!email.trim()}
                className="mt-1 accent-[#8b6f3a] disabled:opacity-40"
              />
              <span className="text-sm md:text-base text-[#5c4d2e] font-light group-hover:text-[#2c2416] transition">
                Email this invitation to them now.
                {!email.trim() && (
                  <span className="italic text-[#8b6f3a]/70"> (Enter an email above to enable.)</span>
                )}
              </span>
            </label>

            {createError && (
              <p className="text-sm text-[#c0392b] italic">{createError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-3 md:py-4 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-initial"
              >
                {creating ? 'Creating…' : 'Create invitation'}
              </button>
            </div>
          </form>

          {/* Just-created banner with copy link */}
          {lastCreated && (
            <CreatedBanner
              data={lastCreated}
              onDismiss={() => setLastCreated(null)}
            />
          )}
        </section>

        {/* Existing invites list */}
        <section>
          <h2 className="font-serif text-2xl md:text-3xl mb-5 md:mb-6">
            Active invitations
          </h2>

          {loading ? (
            <p className="font-serif italic text-[#5c4d2e]">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="font-serif italic text-[#5c4d2e]">
              No invitations yet. Send your first one above.
            </p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {invites.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  onRevoke={() => setRevokeTarget(inv)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this invitation?"
        message={
          revokeTarget
            ? `The link to ${revokeTarget.contributorName} will stop working. Any memories they’ve already shared will be kept.`
            : ''
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

function CreatedBanner({
  data,
  onDismiss,
}: {
  data: CreateResponse
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback handled by select-on-click below
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 md:mt-8 border-l-2 border-[#8b6f3a] bg-[#8b6f3a]/8 p-5 md:p-6"
    >
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
        · Invitation created ·
      </p>
      <p className="font-serif text-lg md:text-xl text-[#2c2416] mb-4">
        Send this link to{' '}
        <span className="italic text-[#8b6f3a]">{data.invite.contributorName}</span>.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          readOnly
          value={data.inviteUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-[#f5f1e8] border border-[#2c2416]/20 px-4 py-3 font-mono text-xs md:text-sm text-[#2c2416] focus:border-[#8b6f3a] focus:outline-none"
        />
        <button
          onClick={copy}
          className="bg-[#2c2416] text-[#f5f1e8] px-5 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {data.email.sent && (
        <p className="text-xs md:text-sm italic text-[#5c4d2e]">
          Also emailed to{' '}
          <span className="font-mono not-italic">{data.invite.contributorEmail}</span>.
        </p>
      )}
      {data.email.error && (
        <p className="text-xs md:text-sm italic text-[#c0392b]">
          The email didn’t send: {data.email.error}. You can still share the link
          above manually.
        </p>
      )}
      {data.email.skipped && (
        <p className="text-xs md:text-sm italic text-[#8b6f3a]/80">
          (Email skipped — Resend not configured in this environment.)
        </p>
      )}

      <button
        onClick={onDismiss}
        className="mt-4 text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] hover:text-[#2c2416] transition"
      >
        Dismiss
      </button>
    </motion.div>
  )
}

function InviteRow({
  invite,
  onRevoke,
}: {
  invite: Invite
  onRevoke: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isExpired = new Date(invite.expiresAt) < new Date()
  const isRevoked = !!invite.revokedAt
  const isInactive = isExpired || isRevoked

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/contribute/${invite.token}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const statusLabel = isRevoked
    ? 'Revoked'
    : isExpired
      ? 'Expired'
      : invite.contributionCount > 0
        ? `${invite.contributionCount} ${invite.contributionCount === 1 ? 'memory' : 'memories'} received`
        : 'Awaiting first memory'

  const statusTone = isRevoked
    ? 'text-[#c0392b]'
    : isExpired
      ? 'text-[#5c4d2e]/60'
      : invite.contributionCount > 0
        ? 'text-green-700'
        : 'text-[#8b6f3a]'

  return (
    <div
      className={`border bg-[#f5f1e8]/60 backdrop-blur-md p-5 md:p-6 ${
        isInactive ? 'border-[#2c2416]/10 opacity-70' : 'border-[#2c2416]/15'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a]">
            For
          </p>
          <h3 className="font-serif text-xl md:text-2xl text-[#2c2416] truncate">
            {invite.contributorName}
          </h3>
          {invite.contributorEmail && (
            <p className="text-xs md:text-sm font-mono text-[#5c4d2e]/80 truncate">
              {invite.contributorEmail}
            </p>
          )}
        </div>
        <p className={`text-xs md:text-sm italic ${statusTone}`}>{statusLabel}</p>
      </div>

      <p className="text-xs md:text-sm text-[#5c4d2e]/80 mb-4">
        {isExpired
          ? `Expired ${formatRelative(invite.expiresAt)}`
          : isRevoked
            ? `Revoked ${formatRelative(invite.revokedAt!)}`
            : `Expires ${formatRelative(invite.expiresAt)}`}
        {' · '}
        Created {formatRelative(invite.createdAt)}
      </p>

      {!isInactive && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            readOnly
            value={inviteUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-[#f5f1e8] border border-[#2c2416]/15 px-3 py-2 font-mono text-xs text-[#2c2416] focus:border-[#8b6f3a] focus:outline-none min-w-0"
          />
          <button
            onClick={copy}
            className="px-4 py-2 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={onRevoke}
            className="px-4 py-2 border border-[#c0392b]/40 text-[#c0392b] hover:bg-[#c0392b]/5 transition text-xs tracking-[0.2em] uppercase"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  )
}

function ThemedSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-[#f5f1e8] border border-[#2c2416]/20 px-4 py-3 pr-10 font-serif text-base md:text-lg text-[#2c2416] focus:border-[#8b6f3a] focus:outline-none transition cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8b6f3a]">
        ▾
      </span>
    </div>
  )
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = t - now
  const absSec = Math.abs(diffMs) / 1000
  const future = diffMs > 0

  if (absSec < 60) return future ? 'in a moment' : 'just now'
  const min = absSec / 60
  if (min < 60) {
    const n = Math.round(min)
    return future ? `in ${n} min` : `${n} min ago`
  }
  const hr = min / 60
  if (hr < 24) {
    const n = Math.round(hr)
    return future ? `in ${n} hr` : `${n} hr ago`
  }
  const days = hr / 24
  if (days < 30) {
    const n = Math.round(days)
    return future ? `in ${n} day${n === 1 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'} ago`
  }
  // Past a month, show a real date
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
