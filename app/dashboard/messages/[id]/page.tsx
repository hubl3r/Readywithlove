// app/dashboard/messages/[id]/page.tsx
'use client'

import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { AppNav } from '@/components/AppNav'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { STATE_LABELS, type MessageState } from '@/lib/messageHelpers'
import { formatLongDate } from '@/lib/dateFormat'
import { useTrimmedVideo } from '@/lib/useTrimmedVideo'

interface Message {
  id: string
  recipientName: string
  recipientEmail: string | null
  type: 'letter' | 'video' | 'photo' | 'story'
  subject: string | null
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  mediaTrimStartSec: number | null
  mediaTrimEndSec: number | null
  triggerDate: string | null
  state: MessageState
  sentAt: string | null
  archivedAt: string | null
  approvalPromptedAt: string | null
  approvalExpiresAt: string | null
}

export default function MessageDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#5c4d2e]">
        <p className="font-serif italic">Loading…</p>
      </div>
    }>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const id = params.id

  const [msg, setMsg] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askSendNow, setAskSendNow] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [askArchive, setAskArchive] = useState(false)

  const banner =
    search.get('sent') ? 'Sent.'
    : search.get('scheduled') ? 'Scheduled.'
    : null

  const refetch = async () => {
    const res = await fetch(`/api/messages/${id}`)
    if (res.ok) setMsg(await res.json())
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const act = async (path: string, body?: object) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/messages/${id}/${path}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Action failed')
      }
      await refetch()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setAskDelete(false)
    setBusy(true)
    try {
      await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      router.push('/dashboard/messages')
    } catch {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#5c4d2e]">
        <p className="font-serif italic">Loading…</p>
      </div>
    )
  }
  if (!msg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#5c4d2e]">
        <p className="font-serif italic">Message not found.</p>
      </div>
    )
  }

  const label = STATE_LABELS[msg.state]
  const trigger = msg.triggerDate ? formatLongDate(msg.triggerDate) : null

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

      <main className="relative z-10 max-w-[900px] mx-auto px-5 md:px-12 py-10 md:py-16">
        <Link
          href="/dashboard/messages"
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition mb-6 inline-block"
        >
          ← Back to shoebox
        </Link>

        {banner && (
          <div className="mb-6 p-4 border border-[#8b6f3a]/40 bg-[#8b6f3a]/10 text-[#5c4d2e] font-serif italic">
            ✓ {banner}
          </div>
        )}

        {msg.state === 'pending_approval' && (
          <div className="mb-8 md:mb-10 p-5 md:p-6 border-2 border-[#c0392b]/40 bg-[#c0392b]/5">
            <p className="font-serif italic text-lg md:text-xl text-[#c0392b] mb-3">
              Awaiting your ok.
            </p>
            <p className="text-sm md:text-base text-[#5c4d2e] mb-4">
              The delivery date has arrived. If you don&apos;t take action within 14
              days, we&apos;ll send it as you scheduled.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => act('approve')}
                disabled={busy}
                className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
              >
                Send now
              </button>
              <Link
                href={`/dashboard/messages/${id}/edit`}
                className="px-5 py-3 border border-[#2c2416] hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs tracking-[0.2em] uppercase"
              >
                Postpone
              </Link>
              <button
                onClick={() => setAskArchive(true)}
                disabled={busy}
                className="px-5 py-3 border border-[#c0392b]/50 text-[#c0392b] hover:bg-[#c0392b]/5 transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
              >
                Cancel &amp; archive
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
          {typeArticle(msg.type)} · {label.label}
        </p>
        <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-2">
          For <span className="italic text-[#8b6f3a]">{msg.recipientName || 'someone'}</span>
        </h1>
        {msg.subject && (
          <p className="font-serif italic text-lg md:text-2xl text-[#5c4d2e] mb-6">
            {msg.subject}
          </p>
        )}

        {trigger && (
          <p className="text-sm md:text-base text-[#5c4d2e] mb-6">
            {msg.state === 'sent' ? 'Delivered on' : 'Scheduled for'}{' '}
            <span className="italic">{trigger}</span>
          </p>
        )}

        <div className="mt-6 mb-8 md:mb-10">
          {msg.type === 'video' && (
            msg.mediaUrl ? (
              <TrimmedVideo
                src={msg.mediaUrl}
                trimStartSec={msg.mediaTrimStartSec}
                trimEndSec={msg.mediaTrimEndSec}
              />
            ) : (
              <p className="font-serif italic text-[#8b6f3a]">No video yet.</p>
            )
          )}
          {msg.type === 'photo' && (
            msg.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.mediaUrl}
                alt={msg.subject || msg.recipientName || 'Photo message'}
                className="block w-full max-h-[70vh] object-contain mx-auto bg-black border border-[#2c2416]/10"
              />
            ) : (
              <p className="font-serif italic text-[#8b6f3a]">No photo yet.</p>
            )
          )}
          {(msg.type === 'letter' || msg.type === 'story') && (
            <div className="bg-[#f5f1e8]/80 border border-[#2c2416]/10 p-6 md:p-10 font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap text-[#2c2416]">
              {msg.content || (
                <span className="italic text-[#8b6f3a]/60">
                  {msg.type === 'letter' ? 'No letter yet…' : 'No story yet…'}
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-[#c0392b] italic">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-8">
          {msg.state !== 'sent' && msg.state !== 'archived' && (
            <Link
              href={`/dashboard/messages/${id}/edit`}
              className="px-5 py-3 text-center border border-[#2c2416] hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs tracking-[0.2em] uppercase"
            >
              Edit
            </Link>
          )}
          {(msg.state === 'drafting' || msg.state === 'scheduled') && (
            <button
              onClick={() => setAskSendNow(true)}
              disabled={busy}
              className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
            >
              Send now
            </button>
          )}
          {msg.state !== 'archived' && msg.state !== 'sent' && msg.state !== 'pending_approval' && (
            <button
              onClick={() => setAskArchive(true)}
              disabled={busy}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
            >
              Archive
            </button>
          )}
          {msg.state === 'archived' && (
            <button
              onClick={() => act('restore')}
              disabled={busy}
              className="px-5 py-3 border border-[#2c2416] hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
            >
              Restore from archive
            </button>
          )}
          <button
            onClick={() => setAskDelete(true)}
            disabled={busy}
            className="px-5 py-3 text-[#c0392b] hover:underline text-xs tracking-[0.2em] uppercase sm:ml-auto disabled:opacity-50"
          >
            Delete permanently
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={askSendNow}
        title="Send this message now?"
        message="The recipient will receive it immediately. This cannot be undone."
        tone="danger"
        confirmLabel="Send now"
        onConfirm={() => {
          setAskSendNow(false)
          act('send-now')
        }}
        onCancel={() => setAskSendNow(false)}
      />

      <ConfirmDialog
        open={askArchive}
        title="Archive this message?"
        message="It will be moved to your archive. You can restore it any time before deleting."
        confirmLabel="Archive"
        onConfirm={() => {
          setAskArchive(false)
          act('archive')
        }}
        onCancel={() => setAskArchive(false)}
      />

      <ConfirmDialog
        open={askDelete}
        title="Delete permanently?"
        message="This message and any video attached will be removed forever."
        tone="danger"
        confirmLabel="Delete forever"
        onConfirm={remove}
        onCancel={() => setAskDelete(false)}
      />
    </div>
  )
}

function typeArticle(type: 'letter' | 'video' | 'photo' | 'story'): string {
  switch (type) {
    case 'letter': return 'A letter'
    case 'video':  return 'A video message'
    case 'photo':  return 'A photo'
    case 'story':  return 'A story'
  }
}

/**
 * Tiny inline wrapper that pairs the trim hook with a <video> element.
 * The hook reads the trim values and enforces them via loadedmetadata
 * + timeupdate listeners. Blob is full-length; experience is trimmed.
 *
 * Zip 2c.5 hotfix 4 (C): adds a Restart button below the player when
 * trim is active. The browser's pause-at-end behavior can look like the
 * video froze — Restart gives users an obvious way to replay from the
 * trim start without having to scrub.
 */
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
      el.play().catch(() => {
        /* Autoplay blocked or paused state — leave the user to hit play */
      })
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <video
        ref={ref}
        src={src}
        controls
        playsInline
        className="w-full bg-black"
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
