// app/contribute/[token]/sent/[contributionId]/SentReview.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { upload } from '@vercel/blob/client'
import { LetterEditor } from '@/components/LetterEditor'
import { VideoRecorder } from '@/components/VideoRecorder'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  computeLockStatus,
  describeLockReason,
  formatTimeRemaining,
} from '@/lib/contributionLock'

interface Contribution {
  id: string
  type: 'letter' | 'video' | 'photo' | 'story'
  content: string | null
  mediaUrl: string | null
  mediaDurationSec: number | null
  mediaTrimStartSec: number | null
  mediaTrimEndSec: number | null
  contributorNote: string | null
  viewedByUser: boolean
  createdAt: string
}

const TYPE_META: Record<Contribution['type'], { label: string; icon: string }> = {
  letter: { label: 'Letter', icon: '✎' },
  video: { label: 'Video', icon: '●' },
  photo: { label: 'Photo', icon: '◇' },
  story: { label: 'Story', icon: '❦' },
}

const ALLOWED_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const MAX_PHOTO_BYTES = 20 * 1024 * 1024

export function SentReview({
  token,
  inviterName,
  contribution: initial,
}: {
  token: string
  inviterName: string
  contribution: Contribution
}) {
  const router = useRouter()
  const [contribution, setContribution] = useState<Contribution>(initial)
  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit-mode local state — only relevant while editing
  const [draftContent, setDraftContent] = useState(initial.content ?? '')
  const [draftNote, setDraftNote] = useState(initial.contributorNote ?? '')
  const [pendingMedia, setPendingMedia] = useState<{
    url: string
    blobPath: string
    durationSec?: number
    trimStartSec?: number | null
    trimEndSec?: number | null
  } | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  // Live lock status — re-computed on each render, ticked every 30s
  const lock = computeLockStatus(contribution.createdAt, contribution.viewedByUser, now)

  useEffect(() => {
    const tick = () => setNow(new Date())
    const interval = window.setInterval(tick, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const meta = TYPE_META[contribution.type]

  // ─────────────────────────────────────────────
  // Save edit
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    setPending(true)
    setErrorMsg(null)
    try {
      const body: Record<string, unknown> = {
        contributorNote: draftNote.trim() || null,
      }
      if (contribution.type === 'letter' || contribution.type === 'story') {
        if (!draftContent.trim()) {
          setErrorMsg('Content cannot be empty')
          setPending(false)
          return
        }
        body.content = draftContent
      }
      if (pendingMedia) {
        body.mediaUrl = pendingMedia.url
        body.mediaBlobPath = pendingMedia.blobPath
        if (contribution.type === 'video' && pendingMedia.durationSec !== undefined) {
          body.mediaDurationSec = pendingMedia.durationSec
        }
        if (contribution.type === 'video') {
          // Send trim values even when null — replacing media should reset
          // any prior trim. Null is a valid "no trim from this side" state.
          body.mediaTrimStartSec = pendingMedia.trimStartSec ?? null
          body.mediaTrimEndSec = pendingMedia.trimEndSec ?? null
        }
      }

      const res = await fetch(
        `/api/contributions/by-token/${token}/${contribution.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.locked) {
          // Server says it's locked now — refresh our view to reflect that
          setContribution((c) => ({ ...c, viewedByUser: true }))
          setMode('view')
          setErrorMsg(j.error || 'This can no longer be edited')
          return
        }
        throw new Error(j.error || 'Could not save')
      }
      const data = await res.json()
      setContribution((c) => ({
        ...c,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaDurationSec: data.mediaDurationSec,
        mediaTrimStartSec: data.mediaTrimStartSec ?? null,
        mediaTrimEndSec: data.mediaTrimEndSec ?? null,
        contributorNote: data.contributorNote,
      }))
      setPendingMedia(null)
      setMode('view')
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  // ─────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────
  const handleDelete = async () => {
    setPending(true)
    setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/contributions/by-token/${token}/${contribution.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.locked) {
          setContribution((c) => ({ ...c, viewedByUser: true }))
          setErrorMsg(j.error || 'This can no longer be deleted')
          setConfirmDelete(false)
          return
        }
        throw new Error(j.error || 'Could not delete')
      }
      router.push(`/contribute/${token}/thanks`)
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPending(false)
    }
  }

  // ─────────────────────────────────────────────
  // Photo re-upload (used only in edit mode for photo contributions)
  // ─────────────────────────────────────────────
  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrorMsg(null)

    const baseType = (file.type || '').split(';')[0].trim()
    if (!ALLOWED_PHOTO_MIME.includes(baseType)) {
      setErrorMsg(`Unsupported file type (${baseType}). Try JPG, PNG, or WebP.`)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMsg(
        `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. Limit is ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`
      )
      return
    }

    setPhotoUploading(true)
    try {
      const ext = (baseType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const filename = `contributions/${token}/${Date.now()}.${ext}`
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: `/api/contributions/by-token/${token}/${contribution.id}/upload-url`,
        contentType: baseType,
        clientPayload: JSON.stringify({ kind: 'photo' }),
      })
      setPendingMedia({ url: blob.url, blobPath: blob.pathname })
    } catch (err) {
      setErrorMsg(`Upload failed: ${(err as Error).message}`)
    } finally {
      setPhotoUploading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-6 md:mt-8"
    >
      {/* Header */}
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3 md:mb-4 flex items-center gap-3 flex-wrap">
        <span>
          <span className="text-base mr-1">{meta.icon}</span>
          {meta.label}
        </span>
        <span className="text-[#5c4d2e]/60 normal-case tracking-wide italic">
          For {inviterName === 'them' ? 'a loved one' : inviterName}
        </span>
        <LockOrTimer locked={lock.locked} reason={lock.reason} msRemaining={lock.msRemaining} />
      </p>

      <h1 className="font-serif text-3xl md:text-4xl leading-tight mb-8 md:mb-10">
        {mode === 'edit' ? 'Edit your contribution' : 'What you sent'}
      </h1>

      {/* Locked banner */}
      {lock.locked && mode === 'view' && (
        <div className="border-l-2 border-[#5c4d2e]/40 pl-5 py-3 mb-8 bg-[#f5f1e8]/60">
          <p className="font-serif italic text-sm md:text-base text-[#5c4d2e]">
            This contribution is locked. {describeLockReason(lock.reason)}.
            You can still review it below, but it can no longer be edited
            or deleted.
          </p>
        </div>
      )}

      {/* View mode */}
      {mode === 'view' && (
        <div className="mb-10 md:mb-12">
          {(contribution.type === 'letter' || contribution.type === 'story') && (
            <article className="bg-[#f5f1e8]/60 backdrop-blur-md border border-[#2c2416]/15 p-6 md:p-8">
              <p className="font-serif text-base md:text-lg text-[#2c2416] leading-relaxed whitespace-pre-wrap">
                {contribution.content}
              </p>
            </article>
          )}
          {contribution.type === 'video' && contribution.mediaUrl && (
            <div className="bg-black border border-[#2c2416]/15">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={contribution.mediaUrl}
                controls
                playsInline
                className="block w-full max-h-[65vh] mx-auto"
              />
            </div>
          )}
          {contribution.type === 'photo' && contribution.mediaUrl && (
            <div className="bg-black border border-[#2c2416]/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contribution.mediaUrl}
                alt="Your contribution"
                className="block w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          )}

          {contribution.contributorNote && (
            <div className="mt-6 border-l-2 border-[#8b6f3a] pl-5 py-2 bg-[#8b6f3a]/5">
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                Your note
              </p>
              <p className="font-serif italic text-sm md:text-base text-[#5c4d2e] whitespace-pre-wrap">
                {contribution.contributorNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit mode */}
      {mode === 'edit' && !lock.locked && (
        <div className="mb-10 md:mb-12 space-y-6">
          {(contribution.type === 'letter' || contribution.type === 'story') && (
            <div>
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                Your {contribution.type}
              </p>
              <LetterEditor value={draftContent} onChange={setDraftContent} />
            </div>
          )}

          {contribution.type === 'video' && (
            <div>
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                Replace the video
              </p>
              <p className="font-serif italic text-sm text-[#5c4d2e] mb-4">
                Record fresh or upload a new file. Saving will discard the previous version.
              </p>
              <VideoRecorder
                messageId={contribution.id}
                initialVideoUrl={pendingMedia?.url ?? contribution.mediaUrl}
                initialTrimStartSec={
                  pendingMedia ? (pendingMedia.trimStartSec ?? null) : contribution.mediaTrimStartSec
                }
                initialTrimEndSec={
                  pendingMedia ? (pendingMedia.trimEndSec ?? null) : contribution.mediaTrimEndSec
                }
                uploadUrlEndpoint={`/api/contributions/by-token/${token}/${contribution.id}/upload-url`}
                patchEndpoint={null}
                blobPathPrefix="contributions"
                uploadClientPayload={JSON.stringify({ kind: 'video' })}
                onUploaded={(info) =>
                  setPendingMedia({
                    url: info.url,
                    blobPath: info.blobPath,
                    durationSec: info.durationSec,
                    trimStartSec: info.trimStartSec,
                    trimEndSec: info.trimEndSec,
                  })
                }
              />
            </div>
          )}

          {contribution.type === 'photo' && (
            <div>
              <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
                Replace the photo
              </p>
              {(pendingMedia?.url ?? contribution.mediaUrl) && (
                <div className="mb-4 border border-[#2c2416]/15 bg-black overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingMedia?.url ?? contribution.mediaUrl ?? ''}
                    alt="Your contribution"
                    className="block w-full max-h-[50vh] object-contain mx-auto"
                  />
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept={ALLOWED_PHOTO_MIME.join(',')}
                onChange={handlePhotoPicked}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
              >
                {photoUploading ? 'Uploading…' : pendingMedia ? '↻ Replace again' : '↑ Choose a different photo'}
              </button>
            </div>
          )}

          {/* Note (always editable) */}
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
              Note (optional)
            </p>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={3}
              placeholder="A bit of context, if you’d like"
              className="w-full bg-[#f5f1e8]/60 backdrop-blur-md border border-[#2c2416]/15 px-4 py-3 font-serif text-base text-[#2c2416] placeholder:italic placeholder:text-[#5c4d2e]/50 focus:border-[#8b6f3a] focus:outline-none transition resize-y"
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {errorMsg && (
        <p className="mb-4 text-sm text-[#c0392b] italic">{errorMsg}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 md:gap-4">
        {mode === 'view' && !lock.locked && (
          <>
            <button
              onClick={() => setMode('edit')}
              className="bg-[#2c2416] text-[#f5f1e8] px-5 md:px-6 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="border border-[#c0392b]/40 text-[#c0392b] px-5 md:px-6 py-3 hover:bg-[#c0392b]/5 transition text-xs tracking-[0.2em] uppercase"
            >
              Delete
            </button>
          </>
        )}
        {mode === 'edit' && (
          <>
            <button
              onClick={handleSave}
              disabled={pending || photoUploading}
              className="bg-[#2c2416] text-[#f5f1e8] px-5 md:px-6 py-3 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-40"
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => {
                setDraftContent(contribution.content ?? '')
                setDraftNote(contribution.contributorNote ?? '')
                setPendingMedia(null)
                setMode('view')
                setErrorMsg(null)
              }}
              disabled={pending}
              className="border border-[#2c2416]/30 px-5 md:px-6 py-3 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase disabled:opacity-40"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this contribution?"
        message="It will be permanently removed. This cannot be undone."
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        cancelLabel="Keep"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </motion.div>
  )
}

function LockOrTimer({
  locked,
  reason,
  msRemaining,
}: {
  locked: boolean
  reason: ReturnType<typeof computeLockStatus>['reason']
  msRemaining: number
}) {
  if (locked) {
    return (
      <span
        className="text-[#5c4d2e]/70 normal-case tracking-wide italic flex items-center gap-1.5"
        title={describeLockReason(reason)}
      >
        <LockIcon />
        Locked · {describeLockReason(reason)}
      </span>
    )
  }
  return (
    <span
      className="text-[#8b6f3a] normal-case tracking-wide italic flex items-center gap-1.5"
      title="Editable until viewed by recipient, or for 24 hours after submitting."
    >
      <ClockIcon />
      {formatTimeRemaining(msRemaining)}
    </span>
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
