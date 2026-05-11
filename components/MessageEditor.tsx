// components/MessageEditor.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { AppNav } from '@/components/AppNav'
import { LetterEditor } from '@/components/LetterEditor'
import { VideoRecorder } from '@/components/VideoRecorder'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Message {
  id: string
  recipientName: string
  recipientEmail: string | null
  type: 'letter' | 'video'
  subject: string | null
  content: string | null
  mediaUrl: string | null
  mediaBlobPath: string | null
  mediaDurationSec: number | null
  triggerDate: string | null
  state: string
}

type Props =
  | { mode: 'new'; initialType: 'letter' | 'video'; messageId?: undefined }
  | { mode: 'edit'; messageId: string; initialType?: undefined }

export function MessageEditor(props: Props) {
  const router = useRouter()

  // Identity / persisted state
  // For new mode, `id` is null until the first save creates the draft.
  const [id, setId] = useState<string | null>(
    props.mode === 'edit' ? props.messageId : null
  )
  const [resolvedType, setResolvedType] = useState<'letter' | 'video'>(
    // For edit mode we'll overwrite after fetch; placeholder until then.
    props.mode === 'new' ? props.initialType : 'letter'
  )
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaBlobPath, setMediaBlobPath] = useState<string | null>(null)
  const [mediaDurationSec, setMediaDurationSec] = useState<number | null>(null)

  // Form fields
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [triggerDate, setTriggerDate] = useState('')

  // UX state
  const [loading, setLoading] = useState(props.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askCancel, setAskCancel] = useState(false)
  const [askSendNow, setAskSendNow] = useState(false)
  // For "back to shoebox" — 3-button dialog: Save / Discard / Keep editing
  const [askExit, setAskExit] = useState(false)
  // Tracks whether a provisional draft was created (e.g. by opening camera).
  // When true and the user cancels without saving, we delete the draft so
  // unwanted empty rows don't pile up.
  const [shouldDeleteOnCancel, setShouldDeleteOnCancel] = useState(false)

  // Fetch existing message in edit mode
  useEffect(() => {
    if (props.mode !== 'edit') return
    const messageId = props.messageId
    fetch(`/api/messages/${messageId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Message | null) => {
        if (!data) return
        setRecipientName(data.recipientName ?? '')
        setRecipientEmail(data.recipientEmail ?? '')
        setSubject(data.subject ?? '')
        setContent(data.content ?? '')
        setTriggerDate(data.triggerDate ? data.triggerDate.split('T')[0] : '')
        setResolvedType(data.type)
        setMediaUrl(data.mediaUrl)
        setMediaBlobPath(data.mediaBlobPath)
        setMediaDurationSec(data.mediaDurationSec)
      })
      .finally(() => setLoading(false))
  }, [props])

  // Save — creates the draft on first call (new mode), patches otherwise
  const save = useCallback(
    async (extras: Record<string, unknown> = {}) => {
      setSaving(true)
      setError(null)
      try {
        const payload: Record<string, unknown> = {
          recipientName,
          recipientEmail: recipientEmail || null,
          subject: subject || null,
          content: content || null,
          triggerDate: triggerDate || null,
          ...extras,
        }
        // Re-send media metadata when we have it. The VideoRecorder also
        // PATCHes these after upload, but this is belt-and-suspenders: if
        // there's any race or the VideoRecorder's PATCH silently failed,
        // the next save action (Save Draft / Schedule / Send Now) will
        // also persist what's in local state.
        if (mediaUrl !== null) payload.mediaUrl = mediaUrl
        if (mediaBlobPath !== null) payload.mediaBlobPath = mediaBlobPath
        if (mediaDurationSec !== null) payload.mediaDurationSec = mediaDurationSec

        let updated: Message

        if (id) {
          // Edit existing
          const res = await fetch(`/api/messages/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const e = await res.json().catch(() => ({}))
            throw new Error(e.error || 'Save failed')
          }
          updated = await res.json()
        } else {
          // First save — create
          const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: resolvedType, ...payload }),
          })
          if (!res.ok) {
            const e = await res.json().catch(() => ({}))
            throw new Error(e.error || 'Create failed')
          }
          updated = await res.json()
          setId(updated.id)
          // Replace the URL so refresh goes to /edit, not /new
          window.history.replaceState({}, '', `/dashboard/messages/${updated.id}/edit`)
        }

        setSavedAt(Date.now())
        // The user just saved — this is now a real draft, not a provisional
        // one. Don't delete it if they later cancel or navigate away.
        setShouldDeleteOnCancel(false)
        return updated
      } catch (err) {
        setError((err as Error).message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [id, resolvedType, recipientName, recipientEmail, subject, content, triggerDate, mediaUrl, mediaBlobPath, mediaDurationSec]
  )

  const schedule = async () => {
    if (!triggerDate) {
      setError('Pick a delivery date first.')
      return
    }
    if (!recipientName) {
      setError('Recipient name required.')
      return
    }
    if (resolvedType === 'letter' && !content) {
      setError('Write something before scheduling.')
      return
    }
    if (resolvedType === 'video' && !mediaUrl) {
      setError('Record and save a video before scheduling.')
      return
    }
    setScheduling(true)
    try {
      const updated = await save({ state: 'scheduled' })
      router.push(`/dashboard/messages/${updated.id}?scheduled=1`)
    } catch {
      // error shown via setError
    } finally {
      setScheduling(false)
    }
  }

  const sendNow = async () => {
    setAskSendNow(false)
    try {
      const updated = await save()
      const res = await fetch(`/api/messages/${updated.id}/send-now`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Send failed')
      }
      router.push(`/dashboard/messages/${updated.id}?sent=1`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // Exit flow design (Adam's spec):
  //
  // Two exit paths, both behave the same when there's "nothing to lose":
  //
  // 1. Cancel button (at bottom, next to Save/Schedule/Send):
  //    - Empty → just navigate
  //    - Has content/video → confirm: "Discard? / Keep editing"
  //
  // 2. Back to shoebox link (top-left):
  //    - Empty → just navigate
  //    - Has content/video → 3-way dialog: "Save as draft / Discard / Keep editing"
  //
  // "Has content" means: any field has text, OR a video has been recorded
  // (mediaUrl is set), OR there's a provisional draft from opening the camera.
  //
  // Existing scheduled/sent/archived messages always navigate without
  // confirmation — those aren't drafts and editing here doesn't risk losing
  // them; only the in-flight unsaved edits would be lost.
  const hasContent = !!(
    recipientName ||
    recipientEmail ||
    subject ||
    content ||
    mediaUrl
  )
  const hasProvisionalDraft = shouldDeleteOnCancel && !!id

  // Helper that performs the actual cleanup + navigation
  const discardAndExit = async () => {
    // If this was a provisional draft we created (camera open), delete it
    if (hasProvisionalDraft) {
      try {
        await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      } catch {
        // best-effort; user is leaving anyway
      }
    }
    // If editing an existing draft, leave it alone — only the unsaved
    // edits get discarded, not the underlying draft.
    setAskCancel(false)
    setAskExit(false)
    router.push('/dashboard/messages')
  }

  // Cancel button click — "discard or keep editing"
  const onCancelClick = () => {
    if (hasContent || hasProvisionalDraft) {
      setAskCancel(true)
    } else {
      // Nothing to lose — just navigate. (Note: existing scheduled/sent
      // messages also fall here when no edits have been made.)
      router.push('/dashboard/messages')
    }
  }

  // Back-to-shoebox click — "save / discard / keep editing"
  const onBackClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (hasContent || hasProvisionalDraft) {
      setAskExit(true)
    } else {
      router.push('/dashboard/messages')
    }
  }

  // Exit dialog "Save as draft" → save then navigate
  const saveAndExit = async () => {
    setAskExit(false)
    try {
      await save()
      router.push('/dashboard/messages')
    } catch {
      // error already set via setError; stay on page
    }
  }

  const onVideoUploaded = (info: { url: string; blobPath: string; durationSec: number }) => {
    // Mirror the metadata in local state so subsequent saves include it.
    // VideoRecorder also PATCHes these server-side immediately after upload,
    // but having them in local state means Save Draft / Schedule / Send Now
    // re-send them defensively.
    setMediaUrl(info.url)
    setMediaBlobPath(info.blobPath)
    setMediaDurationSec(info.durationSec)
  }

  // For video mode in "new" state we need to ensure a draft exists before
  // the recorder tries to call /api/messages/[id]/upload-url. If user picks
  // video, we POST immediately to get an id — but only on demand when they
  // click "Open camera". This creates a PROVISIONAL draft that we delete on
  // cancel/exit unless the user explicitly saves.
  const ensureDraftId = async (): Promise<string | null> => {
    if (id) return id
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: resolvedType }),
      })
      if (!res.ok) throw new Error('Could not start')
      const created = await res.json()
      setId(created.id)
      // Mark this draft as provisional — delete on cancel unless saved
      setShouldDeleteOnCancel(true)
      window.history.replaceState({}, '', `/dashboard/messages/${created.id}/edit`)
      return created.id
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8] text-[#5c4d2e]">
        <p className="font-serif italic">Loading…</p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  // Cancel-button dialog text — depends on what would be lost
  const cancelTitle = mediaUrl
    ? 'Discard your video?'
    : 'Discard your changes?'
  const cancelMessage = mediaUrl
    ? 'Your recording and anything you\u2019ve written here will be lost. This cannot be undone.'
    : 'Anything you haven\u2019t saved will be lost.'

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
          onClick={onBackClick}
          className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition mb-6 inline-block"
        >
          ← Back to shoebox
        </Link>

        <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#8b6f3a] mb-3 md:mb-4">
          · {resolvedType === 'video' ? 'A video message' : 'A letter'} ·
        </p>
        <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-8 md:mb-10">
          {recipientName
            ? <>For <span className="italic text-[#8b6f3a]">{recipientName}</span>.</>
            : <>A message for someone.</>}
        </h1>

        <Field label="Their name">
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Who is this for?"
            className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
          />
        </Field>

        <Field label="Their email" hint="So we can deliver it when the time comes.">
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="loved.one@example.com"
            className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
          />
        </Field>

        <Field label="Subject" hint="Optional — the title they&rsquo;ll see.">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="On your wedding day…"
            className="w-full bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
          />
        </Field>

        <Field label={resolvedType === 'video' ? 'Your video' : 'Your letter'}>
          {resolvedType === 'video' ? (
            <VideoModeWrapper
              ensureDraftId={ensureDraftId}
              messageId={id}
              initialUrl={mediaUrl}
              onUploaded={onVideoUploaded}
            />
          ) : (
            <LetterEditor
              value={content}
              onChange={setContent}
              placeholder={`Dear ${recipientName || 'loved one'},`}
            />
          )}
        </Field>

        <Field label="When should it be delivered?" hint="We&rsquo;ll ask you to confirm on this day.">
          <input
            type="date"
            value={triggerDate}
            min={today}
            onChange={(e) => setTriggerDate(e.target.value)}
            className="bg-transparent border-b border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none py-2 text-base md:text-lg font-serif"
          />
        </Field>

        {error && <p className="mt-4 text-sm text-[#c0392b] italic">{error}</p>}
        {savedAt && !error && (
          <p className="mt-4 text-xs italic text-[#8b6f3a]">
            {saving ? 'saving…' : '✓ saved'}
          </p>
        )}

        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row sm:flex-wrap gap-3 md:gap-4">
          <button
            onClick={onCancelClick}
            className="px-5 md:px-6 py-3 md:py-4 text-[#5c4d2e] hover:text-[#2c2416] transition text-xs md:text-sm tracking-[0.2em] uppercase"
          >
            Cancel
          </button>
          <button
            onClick={() => save()}
            disabled={saving}
            className="px-5 md:px-6 py-3 md:py-4 border border-[#2c2416] hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs md:text-sm tracking-[0.2em] uppercase disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={schedule}
            disabled={scheduling || saving}
            className="px-5 md:px-6 py-3 md:py-4 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs md:text-sm tracking-[0.2em] uppercase disabled:opacity-50"
          >
            {scheduling ? 'Scheduling…' : 'Schedule'}
          </button>
          <button
            onClick={() => setAskSendNow(true)}
            className="px-5 md:px-6 py-3 md:py-4 border border-[#c0392b]/50 text-[#c0392b] hover:bg-[#c0392b]/5 transition text-xs md:text-sm tracking-[0.2em] uppercase sm:ml-auto"
          >
            Send now
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={askCancel}
        title={cancelTitle}
        message={cancelMessage}
        tone="danger"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={discardAndExit}
        onCancel={() => setAskCancel(false)}
      />

      {/* Back-to-shoebox 3-button dialog: Save / Discard / Keep editing */}
      <ConfirmDialog
        open={askExit}
        title="Save your work?"
        message={
          mediaUrl
            ? 'You have a recording and unsaved changes. Save them as a draft to come back to later, or discard them.'
            : 'You have unsaved changes. Save them as a draft to come back to later, or discard them.'
        }
        confirmLabel="Save as draft"
        alternateLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={saveAndExit}
        onAlternate={discardAndExit}
        onCancel={() => setAskExit(false)}
      />

      <ConfirmDialog
        open={askSendNow}
        title="Send this message now?"
        message="The recipient will receive it immediately. This cannot be undone."
        tone="danger"
        confirmLabel="Send now"
        onConfirm={sendNow}
        onCancel={() => setAskSendNow(false)}
      />
    </div>
  )
}

// VideoModeWrapper makes sure a draft id exists before the recorder can run
// (the upload-url endpoint requires one). Renders a "begin recording" gate
// in new mode until the user actually clicks, at which point we POST and
// hand the id to VideoRecorder.
function VideoModeWrapper({
  ensureDraftId,
  messageId,
  initialUrl,
  onUploaded,
}: {
  ensureDraftId: () => Promise<string | null>
  messageId: string | null
  initialUrl: string | null
  onUploaded: (url: string, durationSec: number) => void
}) {
  const [resolvedId, setResolvedId] = useState<string | null>(messageId)
  const [resolving, setResolving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setResolvedId(messageId)
  }, [messageId])

  if (resolvedId) {
    return (
      <VideoRecorder
        messageId={resolvedId}
        onUploaded={onUploaded}
        initialVideoUrl={initialUrl}
      />
    )
  }

  return (
    <div className="border border-dashed border-[#2c2416]/30 p-8 text-center">
      <p className="font-serif italic text-[#5c4d2e] mb-4">
        Ready when you are.
      </p>
      <button
        type="button"
        disabled={resolving}
        onClick={async () => {
          setResolving(true)
          setErr(null)
          const id = await ensureDraftId()
          if (id) {
            setResolvedId(id)
          } else {
            setErr('Could not start. Try again.')
          }
          setResolving(false)
        }}
        className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
      >
        {resolving ? 'Preparing…' : 'Open camera'}
      </button>
      {err && <p className="mt-3 text-xs text-[#c0392b] italic">{err}</p>}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-7 md:mb-8">
      <label className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#5c4d2e] mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs italic text-[#8b6f3a]/80">{hint}</p>}
    </div>
  )
}
