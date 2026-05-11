// app/contribute/[token]/ContributeForm.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { upload } from '@vercel/blob/client'
import { LetterEditor } from '@/components/LetterEditor'
import { VideoRecorder } from '@/components/VideoRecorder'

type ContributionType = 'letter' | 'video' | 'photo' | 'story'

const TYPE_OPTIONS: {
  id: ContributionType
  label: string
  blurb: string
  icon: string
}[] = [
  {
    id: 'letter',
    label: 'A letter',
    blurb: 'Write a note, addressed to them.',
    icon: '✎',
  },
  {
    id: 'video',
    label: 'A video',
    blurb: 'Record or upload — say it in your own voice.',
    icon: '●',
  },
  {
    id: 'photo',
    label: 'A photo',
    blurb: 'Share a picture worth keeping.',
    icon: '◇',
  },
  {
    id: 'story',
    label: 'A story',
    blurb: 'A memory you’d like preserved.',
    icon: '❦',
  },
]

const ALLOWED_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const MAX_PHOTO_BYTES = 20 * 1024 * 1024

interface Props {
  token: string
  contributorName: string
}

export function ContributeForm({ token, contributorName }: Props) {
  const router = useRouter()
  const [type, setType] = useState<ContributionType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Letter/story state
  const [content, setContent] = useState('')

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoBlobPath, setVideoBlobPath] = useState<string | null>(null)
  const [videoDurationSec, setVideoDurationSec] = useState<number>(0)

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoBlobPath, setPhotoBlobPath] = useState<string | null>(null)
  const [photoLocalPreview, setPhotoLocalPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  // Optional note from contributor (shown on every type)
  const [note, setNote] = useState('')

  const ready: boolean = (() => {
    if (!type) return false
    if (type === 'letter' || type === 'story') return content.trim().length > 0
    if (type === 'video') return !!videoUrl
    if (type === 'photo') return !!photoUrl
    return false
  })()

  const handleSubmit = async () => {
    if (!type || !ready || submitting) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          type,
          content: type === 'letter' || type === 'story' ? content : undefined,
          mediaUrl:
            type === 'video' ? videoUrl :
            type === 'photo' ? photoUrl :
            undefined,
          mediaBlobPath:
            type === 'video' ? videoBlobPath :
            type === 'photo' ? photoBlobPath :
            undefined,
          mediaDurationSec: type === 'video' ? videoDurationSec : undefined,
          contributorNote: note.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not submit')
      }
      router.push(`/contribute/${token}/thanks`)
    } catch (err) {
      setErrorMsg((err as Error).message)
      setSubmitting(false)
    }
  }

  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setErrorMsg(null)
    const baseType = (file.type || '').split(';')[0].trim()
    if (!ALLOWED_PHOTO_MIME.includes(baseType)) {
      setErrorMsg(`That file type (${baseType || 'unknown'}) isn’t supported. Try a JPG, PNG, or WebP image.`)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMsg(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`)
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPhotoLocalPreview(localPreview)
    setPhotoUploading(true)
    try {
      const ext = (baseType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const filename = `contributions/${token}/${Date.now()}.${ext}`
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/contributions/upload-url',
        contentType: baseType,
        clientPayload: JSON.stringify({ token, kind: 'photo' }),
      })
      setPhotoUrl(blob.url)
      setPhotoBlobPath(blob.pathname)
    } catch (err) {
      setErrorMsg(`Upload failed: ${(err as Error).message}`)
      setPhotoLocalPreview(null)
      URL.revokeObjectURL(localPreview)
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div>
      {/* Type picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-10 md:mb-12">
        {TYPE_OPTIONS.map((opt) => {
          const active = type === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setType(opt.id)}
              className={`text-left border p-5 md:p-6 transition group ${
                active
                  ? 'border-[#2c2416] bg-[#2c2416] text-[#f5f1e8]'
                  : 'border-[#2c2416]/15 bg-[#f5f1e8]/60 backdrop-blur-md hover:border-[#8b6f3a] hover:bg-[#8b6f3a]/5'
              }`}
            >
              <p className={`text-2xl md:text-3xl font-serif mb-2 ${active ? 'text-[#f5f1e8]' : 'text-[#8b6f3a]'}`}>
                {opt.icon}
              </p>
              <p className={`font-serif text-xl md:text-2xl mb-1 ${active ? 'text-[#f5f1e8]' : 'text-[#2c2416]'}`}>
                {opt.label}
              </p>
              <p className={`text-xs md:text-sm ${active ? 'text-[#f5f1e8]/80' : 'text-[#5c4d2e]'} font-light`}>
                {opt.blurb}
              </p>
            </button>
          )
        })}
      </div>

      {/* Active editor */}
      <AnimatePresence mode="wait">
        {type && (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mb-10 md:mb-12"
          >
            {type === 'letter' && (
              <LetterPanel
                title="Your letter"
                hint={`Take your time. Write whatever you’d like them to hear from you.`}
                placeholder={`Dear ${shortName(contributorName)}…`}
                value={content}
                onChange={setContent}
              />
            )}
            {type === 'story' && (
              <LetterPanel
                title="A memory"
                hint="A moment you remember. A thing that stayed with you. As short or as long as you’d like."
                placeholder="I remember…"
                value={content}
                onChange={setContent}
              />
            )}
            {type === 'video' && (
              <VideoPanel
                token={token}
                onUploaded={(info) => {
                  setVideoUrl(info.url)
                  setVideoBlobPath(info.blobPath)
                  setVideoDurationSec(info.durationSec)
                }}
              />
            )}
            {type === 'photo' && (
              <PhotoPanel
                onPick={() => photoInputRef.current?.click()}
                photoUrl={photoUrl}
                localPreview={photoLocalPreview}
                uploading={photoUploading}
              />
            )}

            {/* Hidden photo input */}
            <input
              ref={photoInputRef}
              type="file"
              accept={ALLOWED_PHOTO_MIME.join(',')}
              onChange={handlePhotoPicked}
              className="hidden"
            />

            {/* Optional note — applies to every type */}
            <div className="mt-8 md:mt-10">
              <label className="block text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">
                A few extra words (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  type === 'photo'
                    ? 'What is this a picture of? When? Where?'
                    : type === 'video'
                      ? 'Anything you’d like to add in writing'
                      : 'A bit of context, if you’d like'
                }
                className="w-full bg-[#f5f1e8]/60 backdrop-blur-md border border-[#2c2416]/15 px-4 py-3 font-serif text-base md:text-lg text-[#2c2416] placeholder:italic placeholder:text-[#5c4d2e]/50 focus:border-[#8b6f3a] focus:outline-none transition resize-y"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Errors */}
      {errorMsg && (
        <p className="mt-2 text-sm text-[#c0392b] italic mb-4">{errorMsg}</p>
      )}

      {/* Submit */}
      {type && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <button
            onClick={handleSubmit}
            disabled={!ready || submitting}
            className="bg-[#2c2416] text-[#f5f1e8] px-6 md:px-8 py-3 md:py-4 hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-initial"
          >
            {submitting ? 'Sending…' : 'Send your gift'}
          </button>
          {!ready && (
            <p className="text-xs md:text-sm italic text-[#8b6f3a]/80">
              {type === 'letter' || type === 'story'
                ? 'Add a few words to continue.'
                : type === 'video'
                  ? 'Record or upload a video to continue.'
                  : 'Pick a photo to continue.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function LetterPanel({
  title,
  hint,
  placeholder,
  value,
  onChange,
}: {
  title: string
  hint: string
  placeholder: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
        {title}
      </p>
      <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] mb-5 max-w-2xl">
        {hint}
      </p>
      <LetterEditor value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function VideoPanel({
  token,
  onUploaded,
}: {
  token: string
  onUploaded: (info: { url: string; blobPath: string; durationSec: number }) => void
}) {
  return (
    <div>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
        Your video
      </p>
      <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] mb-5 max-w-2xl">
        Record fresh, or pick a video you already have. Up to 10 minutes.
      </p>
      <VideoRecorder
        // `messageId` is used as the filename prefix segment. For contributions
        // we use the token (or a sub-id) — just needs to be unique enough to
        // group storage; the actual auth happens via the upload-url endpoint.
        messageId={token}
        onUploaded={onUploaded}
        uploadUrlEndpoint="/api/contributions/upload-url"
        patchEndpoint={null}
        blobPathPrefix="contributions"
        uploadClientPayload={JSON.stringify({ token, kind: 'video' })}
      />
    </div>
  )
}

function PhotoPanel({
  onPick,
  photoUrl,
  localPreview,
  uploading,
}: {
  onPick: () => void
  photoUrl: string | null
  localPreview: string | null
  uploading: boolean
}) {
  const preview = photoUrl ?? localPreview
  return (
    <div>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-[#8b6f3a] mb-2">
        Your photo
      </p>
      <p className="font-serif italic text-base md:text-lg text-[#5c4d2e] mb-5 max-w-2xl">
        A picture worth keeping. Up to 20 MB.
      </p>

      {preview ? (
        <div className="space-y-4">
          <div className="border border-[#2c2416]/15 bg-black overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Your contribution"
              className="block w-full max-h-[60vh] object-contain mx-auto"
            />
          </div>
          {uploading ? (
            <p className="text-sm font-serif italic text-[#5c4d2e]">Uploading…</p>
          ) : (
            <button
              onClick={onPick}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
            >
              ↻ Pick another
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onPick}
          className="w-full md:w-auto px-6 py-4 border-2 border-dashed border-[#2c2416]/25 hover:border-[#8b6f3a] hover:bg-[#8b6f3a]/5 transition text-sm tracking-[0.2em] uppercase text-[#5c4d2e] text-center"
        >
          ↑ Choose a photo
        </button>
      )}
    </div>
  )
}

function shortName(full: string): string {
  // Use first word only as a salutation hint ("Dear John" not "Dear John Smith")
  return full.trim().split(/\s+/)[0] || full
}
