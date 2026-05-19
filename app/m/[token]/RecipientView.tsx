// app/m/[token]/RecipientView.tsx
'use client'

import { useState } from 'react'
import { useTrimmedVideo } from '@/lib/useTrimmedVideo'

interface RecipientViewProps {
  type: string
  subject: string | null
  content: string | null
  mediaUrl: string | null
  mediaTrimStartSec: number | null
  mediaTrimEndSec: number | null
  recipientName: string
  fromName: string
  sentAt: string | null
}

export function RecipientView({
  type,
  subject,
  content,
  mediaUrl,
  mediaTrimStartSec,
  mediaTrimEndSec,
  recipientName,
  fromName,
  sentAt,
}: RecipientViewProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      /* clipboard blocked; fall back to selecting the URL bar visually
         isn't easy from JS — we just leave the indicator unchanged */
    }
  }

  const downloadText = () => {
    if (!content) return
    const safeName = (subject ?? `message-for-${recipientName}`)
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'message'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPhoto = () => {
    if (!mediaUrl) return
    // Use a direct link with download attribute. Vercel Blob serves
    // cross-origin so we navigate to the URL with target=_blank which
    // gives the user the browser's native save flow. download attribute
    // is honored for same-origin but blob storage is cross-origin so
    // open in a new tab is the safest fallback.
    const a = document.createElement('a')
    a.href = mediaUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = `photo-for-${recipientName}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const sentAtPretty = sentAt
    ? new Date(sentAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-[#f5f1e8] py-10 md:py-16 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Wordmark */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8b6f3a] mb-10 text-center">
          ReadyWithLove
        </p>

        {/* Header — recipient + sender */}
        <div className="mb-8 md:mb-12 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#8b6f3a] mb-3">
            {labelForType(type)} for
          </p>
          <h1 className="font-serif text-3xl md:text-5xl text-[#2c2416] leading-tight">
            {recipientName}
          </h1>
          <p className="font-serif italic text-[#5c4d2e] mt-4 text-base md:text-lg">
            from {fromName}
          </p>
        </div>

        {subject && (
          <p className="font-serif italic text-lg md:text-xl text-[#5c4d2e] mb-8 text-center">
            {subject}
          </p>
        )}

        {/* Content */}
        <div className="mb-10 md:mb-12">
          {(type === 'letter' || type === 'story') && (
            <div className="bg-white/60 border border-[#2c2416]/10 p-6 md:p-12 font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap text-[#2c2416]">
              {content || <em className="text-[#8b6f3a]">No content.</em>}
            </div>
          )}

          {type === 'video' && (
            mediaUrl ? (
              <TrimmedVideo
                src={mediaUrl}
                trimStartSec={mediaTrimStartSec}
                trimEndSec={mediaTrimEndSec}
              />
            ) : (
              <p className="font-serif italic text-[#8b6f3a]">
                The video for this message is unavailable.
              </p>
            )
          )}

          {type === 'photo' && (
            mediaUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mediaUrl}
                alt={subject ?? `Photo for ${recipientName}`}
                className="block w-full max-h-[80vh] object-contain mx-auto"
              />
            ) : (
              <p className="font-serif italic text-[#8b6f3a]">
                The photo for this message is unavailable.
              </p>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 justify-center mb-10">
          <button
            onClick={copyLink}
            className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase text-[#2c2416]"
          >
            {copyState === 'copied' ? '✓ Link copied' : '⎘ Share link'}
          </button>

          {(type === 'letter' || type === 'story') && content && (
            <button
              onClick={downloadText}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase text-[#2c2416]"
            >
              ↓ Download as text
            </button>
          )}

          {type === 'photo' && mediaUrl && (
            <button
              onClick={downloadPhoto}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase text-[#2c2416]"
            >
              ↓ Download photo
            </button>
          )}

          {/* Video has no download — the only file we have is the
              untrimmed source, and shipping that would expose footage
              the sender intentionally trimmed out. The link is the
              keepsake; recipient bookmarks it. */}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-[#2c2416]/10">
          {sentAtPretty && (
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#5c4d2e]/60 mb-2">
              Sent {sentAtPretty}
            </p>
          )}
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]/60">
            Made with ReadyWithLove
          </p>
        </div>
      </div>
    </div>
  )
}

function labelForType(type: string): string {
  switch (type) {
    case 'video':
      return 'A video'
    case 'photo':
      return 'A photo'
    case 'story':
      return 'A story'
    case 'letter':
    default:
      return 'A letter'
  }
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
        className="block w-full bg-black max-h-[80vh] mx-auto"
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
