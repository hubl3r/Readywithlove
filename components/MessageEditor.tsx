// components/MessageEditor.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { upload } from '@vercel/blob/client'
import { AppNav } from '@/components/AppNav'
import { LetterEditor } from '@/components/LetterEditor'
import { VideoRecorder } from '@/components/VideoRecorder'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatLongDate } from '@/lib/dateFormat'
import { TYPE_LABELS, type MessageType } from '@/lib/messageHelpers'

interface Message {
  id: string
  recipientName: string
  recipientEmail: string | null
  type: MessageType
  subject: string | null
  content: string | null
  mediaUrl: string | null
  mediaBlobPath: string | null
  mediaDurationSec: number | null
  mediaTrimStartSec: number | null
  mediaTrimEndSec: number | null
  triggerDate: string | null
  state: string
}

type Props =
  | { mode: 'new'; initialType: MessageType; messageId?: undefined }
  | { mode: 'edit'; messageId: string; initialType?: undefined }

function buildSnapshot(
  recipientName: string,
  recipientEmail: string,
  subject: string,
  content: string,
  triggerDate: string,
  mediaUrl: string | null
): string {
  return JSON.stringify({
    recipientName,
    recipientEmail,
    subject,
    content,
    triggerDate,
    mediaUrl,
  })
}

// Per-type prompt text inside the editor. Used to render the appropriate
// placeholder/label and to drive the body editor's intro.
function placeholderForType(type: MessageType, recipientName: string): string {
  switch (type) {
    case 'letter': return `Dear ${recipientName || 'loved one'},`
    case 'story':  return 'I remember when…'
    default:       return ''
  }
}

export function MessageEditor(props: Props) {
  const router = useRouter()

  const [id, setId] = useState<string | null>(
    props.mode === 'edit' ? props.messageId : null
  )
  const [resolvedType, setResolvedType] = useState<MessageType>(
    props.mode === 'new' ? props.initialType : 'letter'
  )
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaBlobPath, setMediaBlobPath] = useState<string | null>(null)
  const [mediaDurationSec, setMediaDurationSec] = useState<number | null>(null)
  const [mediaTrimStartSec, setMediaTrimStartSec] = useState<number | null>(null)
  const [mediaTrimEndSec, setMediaTrimEndSec] = useState<number | null>(null)

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [triggerDate, setTriggerDate] = useState('')

  const [loading, setLoading] = useState(props.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askCancel, setAskCancel] = useState(false)
  const [askSendNow, setAskSendNow] = useState(false)
  const [askExit, setAskExit] = useState(false)
  const [shouldDeleteOnCancel, setShouldDeleteOnCancel] = useState(false)

  const [savedSnapshot, setSavedSnapshot] = useState<string>('')

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
        setMediaTrimStartSec(data.mediaTrimStartSec)
        setMediaTrimEndSec(data.mediaTrimEndSec)
        setSavedSnapshot(
          buildSnapshot(
            data.recipientName ?? '',
            data.recipientEmail ?? '',
            data.subject ?? '',
            data.content ?? '',
            data.triggerDate ? data.triggerDate.split('T')[0] : '',
            data.mediaUrl
          )
        )
      })
      .finally(() => setLoading(false))
  }, [props])

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
        if (mediaUrl !== null) payload.mediaUrl = mediaUrl
        if (mediaBlobPath !== null) payload.mediaBlobPath = mediaBlobPath
        if (mediaDurationSec !== null) payload.mediaDurationSec = mediaDurationSec
        if (mediaTrimStartSec !== null) payload.mediaTrimStartSec = mediaTrimStartSec
        if (mediaTrimEndSec !== null) payload.mediaTrimEndSec = mediaTrimEndSec

        let updated: Message

        if (id) {
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
          window.history.replaceState({}, '', `/dashboard/messages/${updated.id}/edit`)
        }

        setSavedAt(Date.now())
        setShouldDeleteOnCancel(false)
        setSavedSnapshot(
          buildSnapshot(
            recipientName,
            recipientEmail,
            subject,
            content,
            triggerDate,
            mediaUrl
          )
        )
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
    // Per-type body requirement before scheduling. Text types need content;
    // media types need an uploaded blob URL.
    if (resolvedType === 'letter' && !content) {
      setError('Write something before scheduling.')
      return
    }
    if (resolvedType === 'story' && !content) {
      setError('Tell the story before scheduling.')
      return
    }
    if (resolvedType === 'video' && !mediaUrl) {
      setError('Record and save a video before scheduling.')
      return
    }
    if (resolvedType === 'photo' && !mediaUrl) {
      setError('Add a photo before scheduling.')
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

  const hasAnyContent = !!(
    recipientName ||
    recipientEmail ||
    subject ||
    content ||
    mediaUrl
  )
  const currentSnapshot = buildSnapshot(
    recipientName,
    recipientEmail,
    subject,
    content,
    triggerDate,
    mediaUrl
  )
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot && hasAnyContent
  const hasProvisionalDraft = shouldDeleteOnCancel && !!id

  const discardAndExit = async () => {
    if (hasProvisionalDraft) {
      try {
        await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      } catch {/* best-effort */}
    }
    setAskCancel(false)
    setAskExit(false)
    router.push('/dashboard/messages')
  }

  const onCancelClick = () => {
    if (hasUnsavedChanges || hasProvisionalDraft) {
      setAskCancel(true)
    } else {
      router.push('/dashboard/messages')
    }
  }

  const onBackClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (hasUnsavedChanges || hasProvisionalDraft) {
      setAskExit(true)
    } else {
      router.push('/dashboard/messages')
    }
  }

  const saveAndExit = async () => {
    setAskExit(false)
    try {
      await save()
      router.push('/dashboard/messages')
    } catch {/* error already set; stay on page */}
  }

  // Media uploaded callback — used by both VideoRecorder (video) and the
  // photo input wrapper. Same payload shape for both, durationSec and
  // trim fields unset for photos.
  const onMediaUploaded = (info: {
    url: string
    blobPath: string
    durationSec?: number
    trimStartSec?: number | null
    trimEndSec?: number | null
  }) => {
    setMediaUrl(info.url)
    setMediaBlobPath(info.blobPath)
    if (info.durationSec !== undefined) {
      setMediaDurationSec(info.durationSec)
    }
    if (info.trimStartSec !== undefined) {
      setMediaTrimStartSec(info.trimStartSec)
    }
    if (info.trimEndSec !== undefined) {
      setMediaTrimEndSec(info.trimEndSec)
    }
  }

  // For media types in "new" state we need a draft id before any upload
  // endpoint can be called. Creates a PROVISIONAL draft when the user is
  // about to upload media — deleted on cancel unless explicitly saved.
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

  const cancelTitle = mediaUrl
    ? resolvedType === 'photo' ? 'Discard your photo?' : 'Discard your video?'
    : 'Discard your changes?'
  const cancelMessage = mediaUrl
    ? 'Your media and anything you\u2019ve written here will be lost. This cannot be undone.'
    : 'Anything you haven\u2019t saved will be lost.'

  const typeMeta = TYPE_LABELS[resolvedType]

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
          · {typeMeta.article} ·
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

        <Field label={fieldLabelForType(resolvedType)}>
          {resolvedType === 'video' && (
            <VideoModeWrapper
              ensureDraftId={ensureDraftId}
              messageId={id}
              initialUrl={mediaUrl}
              initialDurationSec={mediaDurationSec}
              initialTrimStartSec={mediaTrimStartSec}
              initialTrimEndSec={mediaTrimEndSec}
              onUploaded={onMediaUploaded}
            />
          )}
          {resolvedType === 'photo' && (
            <PhotoModeWrapper
              ensureDraftId={ensureDraftId}
              messageId={id}
              initialUrl={mediaUrl}
              onUploaded={onMediaUploaded}
            />
          )}
          {(resolvedType === 'letter' || resolvedType === 'story') && (
            <LetterEditor
              value={content}
              onChange={setContent}
              placeholder={placeholderForType(resolvedType, recipientName)}
            />
          )}
        </Field>

        <Field label="When should it be delivered?" hint="We&rsquo;ll ask you to confirm on this day.">
          <div className="relative inline-block">
            <input
              type="date"
              value={triggerDate}
              min={today}
              onChange={(e) => setTriggerDate(e.target.value)}
              className="bg-[#f5f1e8]/60 border border-[#2c2416]/30 hover:border-[#2c2416]/60 focus:border-[#8b6f3a] outline-none px-4 py-3 pr-10 text-base md:text-lg font-serif text-[#2c2416] cursor-pointer min-w-[180px] transition"
              aria-label="Delivery date"
            />
            <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b6f3a] pointer-events-none text-lg">
              ⌗
            </span>
          </div>
          {triggerDate && (
            <p className="mt-2 font-serif italic text-[#5c4d2e]">
              {formatLongDate(triggerDate)}
            </p>
          )}
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
            onClick={async () => {
              try {
                await save()
                router.push('/dashboard/messages')
              } catch {/* stay on page */}
            }}
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

      <ConfirmDialog
        open={askExit}
        title="Save your work?"
        message={
          mediaUrl
            ? 'You have media and unsaved changes. Save them as a draft to come back to later, or discard them.'
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

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function fieldLabelForType(type: MessageType): string {
  switch (type) {
    case 'letter': return 'Your letter'
    case 'video':  return 'Your video'
    case 'photo':  return 'Your photo'
    case 'story':  return 'Your story'
  }
}

// ────────────────────────────────────────────────────────────
// VideoModeWrapper — unchanged from Zip 2b (Zip 2c.1 added optional
// recorder props, but for messages we use the legacy defaults).
// ────────────────────────────────────────────────────────────
function VideoModeWrapper({
  ensureDraftId,
  messageId,
  initialUrl,
  initialDurationSec,
  initialTrimStartSec,
  initialTrimEndSec,
  onUploaded,
}: {
  ensureDraftId: () => Promise<string | null>
  messageId: string | null
  initialUrl: string | null
  initialDurationSec: number | null
  initialTrimStartSec: number | null
  initialTrimEndSec: number | null
  onUploaded: (info: {
    url: string
    blobPath: string
    durationSec: number
    trimStartSec: number | null
    trimEndSec: number | null
  }) => void
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
        initialDurationSec={initialDurationSec}
        initialTrimStartSec={initialTrimStartSec}
        initialTrimEndSec={initialTrimEndSec}
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
          if (id) setResolvedId(id)
          else setErr('Could not start. Try again.')
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

// ────────────────────────────────────────────────────────────
// PhotoModeWrapper — new in Zip 2c.2.2. Parallel structure to
// VideoModeWrapper: gates on draft id before allowing upload. Uses the
// new /api/messages/[id]/upload-photo-url endpoint.
// ────────────────────────────────────────────────────────────
const ALLOWED_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const MAX_PHOTO_BYTES = 20 * 1024 * 1024

function PhotoModeWrapper({
  ensureDraftId,
  messageId,
  initialUrl,
  onUploaded,
}: {
  ensureDraftId: () => Promise<string | null>
  messageId: string | null
  initialUrl: string | null
  onUploaded: (info: { url: string; blobPath: string }) => void
}) {
  const [resolvedId, setResolvedId] = useState<string | null>(messageId)
  const [resolving, setResolving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(initialUrl)
  const [err, setErr] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setResolvedId(messageId)
  }, [messageId])

  useEffect(() => {
    if (initialUrl) setLocalPreview(initialUrl)
  }, [initialUrl])

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(null)

    const baseType = (file.type || '').split(';')[0].trim()
    if (!ALLOWED_PHOTO_MIME.includes(baseType)) {
      setErr(`Unsupported file type (${baseType}). Try JPG, PNG, or WebP.`)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErr(
        `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. Limit is ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`
      )
      return
    }

    // Ensure draft exists before uploading
    let id = resolvedId
    if (!id) {
      const newId = await ensureDraftId()
      if (!newId) {
        setErr('Could not start. Try again.')
        return
      }
      id = newId
      setResolvedId(newId)
    }

    // Show immediate preview while uploading
    const blobLocal = URL.createObjectURL(file)
    setLocalPreview(blobLocal)
    setUploading(true)
    try {
      const ext = (baseType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const filename = `messages/${id}/${Date.now()}.${ext}`
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: `/api/messages/${id}/upload-photo-url`,
        contentType: baseType,
      })
      // PATCH the message row so the URL is persisted even if the webhook
      // (server-to-server) doesn't fire (e.g. localhost dev).
      try {
        await fetch(`/api/messages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaUrl: blob.url,
            mediaBlobPath: blob.pathname,
          }),
        })
      } catch {/* webhook is the primary path; this is belt-and-suspenders */}
      onUploaded({ url: blob.url, blobPath: blob.pathname })
      setLocalPreview(blob.url)
    } catch (err) {
      setErr(`Upload failed: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_PHOTO_MIME.join(',')}
        onChange={handlePick}
        className="hidden"
      />
      {localPreview ? (
        <div>
          <div className="border border-[#2c2416]/15 bg-black overflow-hidden mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={localPreview}
              alt="Your photo"
              className="block w-full max-h-[60vh] object-contain mx-auto"
            />
          </div>
          {uploading ? (
            <p className="text-sm font-serif italic text-[#5c4d2e]">Uploading…</p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setResolving(true)
                if (!resolvedId) {
                  const id = await ensureDraftId()
                  if (id) setResolvedId(id)
                }
                setResolving(false)
                fileInputRef.current?.click()
              }}
              disabled={resolving}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
            >
              ↻ Pick another
            </button>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-[#2c2416]/30 p-8 text-center">
          <p className="font-serif italic text-[#5c4d2e] mb-4">
            A picture worth keeping. JPG, PNG, or WebP — up to 20 MB.
          </p>
          <button
            type="button"
            disabled={resolving || uploading}
            onClick={async () => {
              setResolving(true)
              if (!resolvedId) {
                const id = await ensureDraftId()
                if (!id) {
                  setErr('Could not start. Try again.')
                  setResolving(false)
                  return
                }
                setResolvedId(id)
              }
              setResolving(false)
              fileInputRef.current?.click()
            }}
            className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-50"
          >
            {resolving ? 'Preparing…' : '↑ Choose a photo'}
          </button>
        </div>
      )}
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
