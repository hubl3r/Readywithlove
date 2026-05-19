// app/dashboard/messages/contribution/[id]/ContributionView.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AppNav } from '@/components/AppNav'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useTrimmedVideo } from '@/lib/useTrimmedVideo'

interface Contribution {
  id: string
  type: 'letter' | 'video' | 'photo' | 'story'
  contributorName: string
  contributorEmail: string | null
  contributorNote: string | null
  inviteMessage: string | null
  inviteId: string
  inviteRevokedAt: string | null
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  mediaTrimStartSec: number | null
  mediaTrimEndSec: number | null
  viewedByUser: boolean
  archivedAt: string | null
  importedToTimelineItemId: string | null
  importedToTimelineDate: string | null
  createdAt: string
}

const TYPE_LABELS: Record<Contribution['type'], { label: string; icon: string }> = {
  letter: { label: 'Letter', icon: '✎' },
  video: { label: 'Video', icon: '●' },
  photo: { label: 'Photo', icon: '◇' },
  story: { label: 'Story', icon: '❦' },
}

export function ContributionView({
  contribution: initial,
}: {
  contribution: Contribution
}) {
  const router = useRouter()
  const [contribution, setContribution] = useState<Contribution>(initial)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isArchived = !!contribution.archivedAt
  const isImported = !!contribution.importedToTimelineItemId
  const isInviteRevoked = !!contribution.inviteRevokedAt

  // Fire-and-forget: hit the API GET so server-side viewedByUser flips to
  // true. We already set the local state visually below; this just makes
  // the server agree.
  useEffect(() => {
    if (contribution.viewedByUser) return
    fetch(`/api/contributions/${contribution.id}`)
      .catch(() => {/* ignore — visual state is fine */})
    setContribution((c) => ({ ...c, viewedByUser: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setArchived = async (archive: boolean) => {
    setPending(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/contributions/${contribution.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not update')
      }
      const data = await res.json()
      setContribution((c) => ({ ...c, archivedAt: data.archivedAt }))
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setPending(false)
      setConfirmArchive(false)
    }
  }

  const handleImport = () => {
    router.push(`/dashboard/timeline?prefill=${contribution.id}`)
  }

  /**
   * Zip 2c.4: hard-delete this contribution. Removes the row + blob + the
   * invite's useCount decrement, then routes back to the contributions feed.
   */
  const handleDelete = async () => {
    setPending(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/contributions/${contribution.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not delete')
      }
      router.push('/dashboard/contributions')
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPending(false)
      setConfirmDelete(false)
    }
  }

  /**
   * Zip 2c.4: revoke the underlying invite. Existing contributions stay
   * (they're real memories — we're not deleting history), but no new ones
   * can be submitted through that link. The button on this view exists
   * so users don't have to navigate back to the invites page to do it.
   */
  const handleRevokeInvite = async () => {
    setPending(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/invites/${contribution.inviteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not revoke')
      }
      setContribution((c) => ({
        ...c,
        inviteRevokedAt: new Date().toISOString(),
      }))
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setPending(false)
      setConfirmRevoke(false)
    }
  }

  const typeMeta = TYPE_LABELS[contribution.type]

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

      <main className="relative z-10 max-w-[800px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <Link
          href="/dashboard/messages?tab=received"
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          ← Back to the shoebox
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 md:mt-8"
        >
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
            <span className="text-base mr-1">{typeMeta.icon}</span>
            {typeMeta.label}
            {isArchived && <span className="ml-3 text-[#5c4d2e]/70">· Archived</span>}
            {isImported && <span className="ml-3 text-green-700/80">· In your timeline</span>}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-3 md:mb-4">
            From <span className="italic text-[#8b6f3a]">{contribution.contributorName}</span>
          </h1>
          <p className="text-xs md:text-sm italic text-[#8b6f3a]/80 mb-8 md:mb-10">
            Received {formatLong(contribution.createdAt)}
            {contribution.contributorEmail && (
              <>
                {' · '}
                <a
                  href={`mailto:${contribution.contributorEmail}`}
                  className="not-italic hover:text-[#2c2416] transition"
                >
                  {contribution.contributorEmail}
                </a>
              </>
            )}
          </p>

          {/* Main content: letter/story = prose, video = player, photo = image */}
          <div className="mb-10 md:mb-12">
            {(contribution.type === 'letter' || contribution.type === 'story') && (
              <article className="bg-[#f5f1e8]/60 backdrop-blur-md border border-[#2c2416]/15 p-6 md:p-10">
                <p className="font-serif text-base md:text-xl text-[#2c2416] leading-relaxed whitespace-pre-wrap">
                  {contribution.content}
                </p>
              </article>
            )}

            {contribution.type === 'video' && contribution.mediaUrl && (
              <div className="bg-black border border-[#2c2416]/15">
                <TrimmedVideo
                  src={contribution.mediaUrl}
                  trimStartSec={contribution.mediaTrimStartSec}
                  trimEndSec={contribution.mediaTrimEndSec}
                />
              </div>
            )}

            {contribution.type === 'photo' && contribution.mediaUrl && (
              <div className="bg-black border border-[#2c2416]/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={contribution.mediaUrl}
                  alt={`From ${contribution.contributorName}`}
                  className="block w-full max-h-[80vh] object-contain mx-auto"
                />
              </div>
            )}
          </div>

          {/* Contributor note (if any) */}
          {contribution.contributorNote && (
            <div className="mb-10 md:mb-12 border-l-2 border-[#8b6f3a] pl-5 md:pl-6 py-2 bg-[#8b6f3a]/5">
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                A note from {contribution.contributorName}
              </p>
              <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] whitespace-pre-wrap">
                {contribution.contributorNote}
              </p>
            </div>
          )}

          {/* Reminder of the original invitation message (if any) */}
          {contribution.inviteMessage && (
            <details className="mb-10 md:mb-12 border border-[#2c2416]/10 bg-[#f5f1e8]/40 p-5 md:p-6">
              <summary className="cursor-pointer text-xs md:text-sm tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition">
                What you originally wrote to them
              </summary>
              <p className="mt-3 font-serif italic text-sm md:text-base text-[#5c4d2e] whitespace-pre-wrap">
                {contribution.inviteMessage}
              </p>
            </details>
          )}

          {/* Actions */}
          {errorMsg && (
            <p className="mb-4 text-sm text-[#c0392b] italic">{errorMsg}</p>
          )}

          <div className="flex flex-wrap gap-3 md:gap-4">
            {!isImported && !isArchived && (
              <button
                onClick={handleImport}
                className="bg-[#2c2416] text-[#f5f1e8] px-5 md:px-6 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
              >
                Add to my timeline
              </button>
            )}
            {isImported && (
              <span className="px-5 md:px-6 py-3 border border-green-700/30 text-green-700 text-xs tracking-[0.2em] uppercase italic">
                ✓ Added to {formatImportedYear(contribution.importedToTimelineDate)}
              </span>
            )}
            {!isArchived ? (
              <button
                onClick={() => setConfirmArchive(true)}
                disabled={pending}
                className="px-5 md:px-6 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
              >
                Set aside
              </button>
            ) : (
              <button
                onClick={() => setArchived(false)}
                disabled={pending}
                className="px-5 md:px-6 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
              >
                {pending ? 'Restoring…' : 'Restore'}
              </button>
            )}
            {!isInviteRevoked && (
              <button
                onClick={() => setConfirmRevoke(true)}
                disabled={pending}
                className="px-5 md:px-6 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
                title="Block further contributions from this person via this invite"
              >
                Revoke invitation
              </button>
            )}
            {isInviteRevoked && (
              <span className="px-5 md:px-6 py-3 border border-[#5c4d2e]/30 text-[#5c4d2e] text-xs tracking-[0.2em] uppercase italic">
                Invitation revoked
              </span>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="px-5 md:px-6 py-3 border border-[#c0392b]/40 text-[#c0392b] hover:bg-[#c0392b]/5 transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </main>

      <ConfirmDialog
        open={confirmArchive}
        title="Set this aside?"
        message={
          `It will move to your Archived tab. You won’t lose it — you can restore ` +
          `it any time.`
        }
        confirmLabel={pending ? 'Setting aside…' : 'Set aside'}
        cancelLabel="Keep"
        tone="default"
        onConfirm={() => setArchived(true)}
        onCancel={() => setConfirmArchive(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this contribution?"
        message={
          `This will permanently delete this ${typeMeta.label.toLowerCase()} from ` +
          `${contribution.contributorName}. ${contribution.contributorName} will not ` +
          `be notified. This cannot be undone.`
        }
        confirmLabel={pending ? 'Deleting…' : 'Delete forever'}
        cancelLabel="Keep"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmRevoke}
        title={`Revoke ${contribution.contributorName}'s invitation?`}
        message={
          `They won't be able to send any more memories through this invitation. ` +
          `Their existing contributions stay with you. You can issue them a new ` +
          `invitation any time from the invitations page.`
        }
        confirmLabel={pending ? 'Revoking…' : 'Revoke'}
        cancelLabel="Keep active"
        tone="danger"
        onConfirm={handleRevokeInvite}
        onCancel={() => setConfirmRevoke(false)}
      />
    </div>
  )
}

function formatImportedYear(iso: string | null): string {
  if (!iso) return 'your timeline'
  const d = new Date(iso)
  return String(d.getFullYear())
}

function formatLong(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function TrimmedVideo({
  src,
  trimStartSec,
  trimEndSec,
}: {
  src: string
  trimStartSec: number | null
  trimEndSec: number | null
}) {
  const ref = useTrimmedVideo(trimStartSec, trimEndSec)
  const hasTrim = trimStartSec !== null || trimEndSec !== null

  const handleRestart = () => {
    const el = ref.current
    if (!el) return
    try {
      el.currentTime = trimStartSec ?? 0
      el.play().catch(() => {/* ignore */})
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={src}
        controls
        playsInline
        className="block w-full max-h-[70vh] mx-auto"
      />
      {hasTrim && (
        <div className="flex justify-between items-center mt-2 px-1">
          <button
            onClick={handleRestart}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
          >
            ↺ Restart
          </button>
          <p className="text-[10px] italic text-[#5c4d2e]/60">
            Plays {formatTrimRange(trimStartSec, trimEndSec)}
          </p>
        </div>
      )}
    </div>
  )
}

function formatTrimRange(start: number | null, end: number | null): string {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = Math.floor(s % 60)
    return `${m}:${r.toString().padStart(2, '0')}`
  }
  if (start !== null && end !== null) return `from ${fmt(start)} to ${fmt(end)}`
  if (start !== null) return `from ${fmt(start)}`
  if (end !== null) return `up to ${fmt(end)}`
  return ''
}
