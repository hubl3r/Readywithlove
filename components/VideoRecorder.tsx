// components/VideoRecorder.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { upload } from '@vercel/blob/client'

type Stage = 'idle' | 'requesting' | 'live' | 'recording' | 'review' | 'uploading' | 'done' | 'error'
type Source = 'record' | 'file'

interface VideoRecorderProps {
  /**
   * Identifier used in the upload filename path. For outgoing messages this
   * is the message id; for contributions it's the invite token (or a sub-id
   * the parent chooses). Just needs to be unique enough to avoid blob
   * collisions across users.
   */
  messageId: string
  /**
   * Called once after upload completes (and after the optional parent PATCH).
   * Includes trim points the user set in the review stage — both `null` when
   * they didn't trim (full video plays).
   */
  onUploaded: (info: {
    url: string
    blobPath: string
    durationSec: number
    trimStartSec: number | null
    trimEndSec: number | null
  }) => void
  initialVideoUrl?: string | null
  initialTrimStartSec?: number | null
  initialTrimEndSec?: number | null
  maxSeconds?: number

  /**
   * The Vercel Blob client-upload token endpoint. Defaults to
   *   /api/messages/[messageId]/upload-url
   * for backwards compatibility with the existing MessageEditor flow.
   * Contributions pass a token-based public endpoint instead.
   */
  uploadUrlEndpoint?: string

  /**
   * After upload completes, the recorder will PATCH this endpoint with
   *   { mediaUrl, mediaBlobPath, mediaDurationSec, mediaTrimStartSec, mediaTrimEndSec }
   * to link the blob to its parent row. For contributions there's no
   * pre-existing row to patch (the row is created at submit time with
   * the URL already in hand), so contributions pass `null` and the
   * recorder skips the PATCH entirely — parent handles persistence.
   */
  patchEndpoint?: string | null

  /**
   * Filename prefix inside the blob bucket. Defaults to 'videos' (existing
   * behavior). Contributions use 'contributions' so storage is grouped.
   */
  blobPathPrefix?: string

  /**
   * Optional opaque payload sent with the upload-token request, available to
   * the server's onBeforeGenerateToken handler via clientPayload. Used by the
   * contributions flow to pass the invite token (since it can't read a Clerk
   * session). Outgoing messages don't need this — they auth via cookie.
   */
  uploadClientPayload?: string

  /**
   * Whether to show the focus dot above the camera preview during live and
   * recording stages. Defaults to true. The dot oscillates softly to draw
   * the user's gaze toward the camera lens.
   */
  showFocusDot?: boolean
}

const DEFAULT_MAX_SECONDS = 10 * 60
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024 // 500 MB

const ALLOWED_VIDEO_MIME = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
]

/**
 * MediaRecorder-based video recorder, now with optional file-upload path.
 *
 * Design notes (Zip 2c.1):
 *   - Endpoint paths (upload token + PATCH) are now configurable so this
 *     component can serve both outgoing messages and incoming contributions.
 *     Defaults preserve the original message-editor behavior.
 *   - A new "Upload a video" affordance on the idle screen lets the user
 *     pick a pre-recorded file instead of recording fresh. Useful on phones
 *     where users already have the footage in their camera roll.
 *   - For uploaded files we still measure duration via a hidden <video>
 *     metadata load before sending — so the recipient view can show
 *     "Video · 1:34" the same way as recorded clips.
 *
 * Earlier design notes (preserved from Zip 2b.3):
 *   - No resolution constraints on getUserMedia. Phones (iPhone especially)
 *     zoom in heavily when given a target width/height because they crop
 *     from a much larger native sensor. Letting the device pick its native
 *     preview avoids the "arm's-length to fit my head" problem.
 *   - Recording container aspect ratio is measured from the actual stream
 *     once playing, so portrait phone footage gets a portrait frame and
 *     landscape footage gets a landscape frame. No more letterboxing.
 *   - Stop button floats over the video during recording so it's always
 *     reachable in one tap, even on small screens / landscape phone where
 *     the natural form-fill puts the controls below the fold.
 *   - Live + review elements always mounted so srcObject attaches reliably
 *     (the previous race-condition fix from Zip 2b.1).
 *   - max-h on the surface keeps controls visible without scrolling.
 */
export function VideoRecorder({
  messageId,
  onUploaded,
  initialVideoUrl,
  initialTrimStartSec,
  initialTrimEndSec,
  maxSeconds = DEFAULT_MAX_SECONDS,
  uploadUrlEndpoint,
  patchEndpoint,
  blobPathPrefix = 'videos',
  uploadClientPayload,
  showFocusDot = true,
}: VideoRecorderProps) {
  const [stage, setStage] = useState<Stage>(initialVideoUrl ? 'done' : 'idle')
  const [source, setSource] = useState<Source>('record')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideoUrl ?? null)
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9)
  // Trim state. trimStart/trimEnd in seconds. Null = no trim from that side.
  // The clip's full duration is `seconds` (for fresh records) or measured
  // via metadata for uploaded files / existing media.
  const [trimStart, setTrimStart] = useState<number | null>(initialTrimStartSec ?? null)
  const [trimEnd, setTrimEnd] = useState<number | null>(initialTrimEndSec ?? null)

  // Default endpoints (back-compat with MessageEditor)
  const effectiveUploadUrl =
    uploadUrlEndpoint ?? `/api/messages/${messageId}/upload-url`
  // If patchEndpoint is explicitly `null`, skip PATCH entirely. If undefined,
  // use the legacy default. If a string, use that.
  const effectivePatch =
    patchEndpoint === null
      ? null
      : (patchEndpoint ?? `/api/messages/${messageId}`)

  // Sync `initialVideoUrl` if the parent loads it after mount (edit mode).
  useEffect(() => {
    if (!initialVideoUrl) return
    if (stage === 'recording' || stage === 'review' || stage === 'uploading') return
    setPreviewUrl(initialVideoUrl)
    setStage('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideoUrl])

  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
      if (tickRef.current) window.clearInterval(tickRef.current)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [stopCamera, previewUrl])

  const startCamera = async () => {
    setErrorMsg(null)
    setSource('record')
    setStage('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        try {
          await liveVideoRef.current.play()
        } catch {
          // best-effort
        }
      }
      setStage('live')
    } catch (err) {
      const name = (err as Error).name
      setErrorMsg(
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera and microphone access in your browser settings.'
          : name === 'NotFoundError'
            ? 'No camera found. Make sure one is connected.'
            : `Could not access camera: ${(err as Error).message}`
      )
      setStage('error')
    }
  }

  // Pick an existing video file. Measure its duration via metadata load.
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return

    setErrorMsg(null)

    // Validate type
    const baseType = (file.type || '').split(';')[0].trim()
    if (!ALLOWED_VIDEO_MIME.includes(baseType)) {
      setErrorMsg(
        `That file type (${baseType || 'unknown'}) isn’t supported. Try a .mp4, .mov, or .webm video.`
      )
      setStage('error')
      return
    }

    // Validate size
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg(
        `That video is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
      )
      setStage('error')
      return
    }

    // Measure duration + dimensions before showing the review screen
    const url = URL.createObjectURL(file)
    const measured = await measureVideo(url).catch(() => null)
    if (!measured) {
      URL.revokeObjectURL(url)
      setErrorMsg('Could not read that video. It may be corrupted or in an unsupported format.')
      setStage('error')
      return
    }

    if (measured.duration > maxSeconds) {
      URL.revokeObjectURL(url)
      const m = Math.floor(maxSeconds / 60)
      setErrorMsg(
        `That video is ${formatDuration(Math.round(measured.duration))} long. The limit is ${m} minute${m === 1 ? '' : 's'}.`
      )
      setStage('error')
      return
    }

    setSource('file')
    setRecordedBlob(file)
    setPreviewUrl(url)
    setSeconds(Math.round(measured.duration))
    setAspectRatio(measured.aspectRatio)
    stopCamera() // in case camera was on
    setStage('review')
  }

  const handleLiveMetadata = () => {
    const el = liveVideoRef.current
    if (!el) return
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      setAspectRatio(el.videoWidth / el.videoHeight)
    }
  }
  const handleReviewMetadata = () => {
    const el = reviewVideoRef.current
    if (!el) return
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      setAspectRatio(el.videoWidth / el.videoHeight)
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    setSeconds(0)

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ]
    const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      setRecordedBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      stopCamera()
      setStage('review')
    }
    recorder.start(1000)
    setStage('recording')

    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1
        if (next >= maxSeconds) stopRecording()
        return next
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    recorderRef.current?.stop()
  }

  const redo = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setRecordedBlob(null)
    setSeconds(0)
    setTrimStart(null)
    setTrimEnd(null)
    if (source === 'record') {
      startCamera()
    } else {
      // For file-source, go back to idle so the user can pick again
      setStage('idle')
    }
  }

  const acceptAndUpload = async () => {
    if (!recordedBlob) return
    setStage('uploading')
    try {
      // Strip codec parameters from MIME — Vercel Blob exact-matches.
      const baseMimeType = (recordedBlob.type || 'video/webm').split(';')[0].trim()
      const ext = (baseMimeType.split('/')[1] || 'webm')
      const filename = `${blobPathPrefix}/${messageId}/${Date.now()}.${ext}`

      const blob = await upload(filename, recordedBlob, {
        access: 'public',
        handleUploadUrl: effectiveUploadUrl,
        contentType: baseMimeType,
        ...(uploadClientPayload ? { clientPayload: uploadClientPayload } : {}),
      })

      // Optionally PATCH a parent row to link this blob. Contributions skip
      // this (their parent row is created on submit, with the URL in hand).
      if (effectivePatch) {
        const patchRes = await fetch(effectivePatch, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaUrl: blob.url,
            mediaBlobPath: blob.pathname,
            mediaDurationSec: seconds,
            mediaTrimStartSec: trimStart,
            mediaTrimEndSec: trimEnd,
          }),
        })
        if (!patchRes.ok) {
          const errJson = await patchRes.json().catch(() => ({}))
          throw new Error(
            `Saved video to storage, but couldn’t link it to your message: ${errJson.error || patchRes.statusText}`
          )
        }
      }

      onUploaded({
        url: blob.url,
        blobPath: blob.pathname,
        durationSec: seconds,
        trimStartSec: trimStart,
        trimEndSec: trimEnd,
      })
      setStage('done')
    } catch (err) {
      setErrorMsg(`Upload failed: ${(err as Error).message}`)
      setStage('error')
    }
  }

  const showLive = stage === 'requesting' || stage === 'live' || stage === 'recording'
  const showReview = stage === 'review' || stage === 'done' || stage === 'uploading'

  const frameStyle: React.CSSProperties = {
    aspectRatio: `${aspectRatio}`,
    maxHeight: '60vh',
    maxWidth: aspectRatio < 1 ? '420px' : undefined,
    margin: '0 auto',
  }

  return (
    <div className="w-full">
      {/* Focus dot — positioned above the camera frame so users naturally
          look up toward the lens (which on most laptops and phones sits
          above the screen). Soft oscillation draws gaze without being
          distracting. Only visible during live/recording stages. */}
      {showFocusDot && (stage === 'live' || stage === 'recording') && (
        <div className="flex justify-center mb-2">
          <FocusDot />
        </div>
      )}

      <div
        className="relative bg-black overflow-hidden border border-[#2c2416]/20"
        style={frameStyle}
      >
        <video
          ref={liveVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleLiveMetadata}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
            showLive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
        {showReview && previewUrl && (
          <video
            ref={reviewVideoRef}
            src={previewUrl}
            controls
            playsInline
            onLoadedMetadata={handleReviewMetadata}
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
        {stage === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center text-[#f5f1e8]/60 italic font-serif text-base md:text-lg px-4 text-center">
            Camera will appear here
          </div>
        )}
        {stage === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center text-[#f5f1e8]/80 italic font-serif px-4 text-center">
            Asking your browser for camera access…
          </div>
        )}

        {/* REC badge */}
        <AnimatePresence>
          {stage === 'recording' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-3 flex items-center gap-2 bg-[#c0392b] text-[#f5f1e8] px-3 py-1 rounded-full text-xs tracking-widest uppercase z-10"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 bg-[#f5f1e8] rounded-full"
              />
              REC {formatDuration(seconds)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Stop button */}
        <AnimatePresence>
          {stage === 'recording' && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={stopRecording}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#c0392b] hover:bg-[#a13322] active:bg-[#a13322] transition flex items-center justify-center shadow-2xl ring-4 ring-[#f5f1e8]/80 z-10"
              aria-label="Stop recording"
            >
              <span className="block w-5 h-5 md:w-6 md:h-6 bg-[#f5f1e8]" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file input — triggered by "Upload a video" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_VIDEO_MIME.join(',')}
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* Controls below the surface */}
      <div className="mt-4 flex flex-wrap gap-3">
        {stage === 'idle' && (
          <>
            <button
              onClick={startCamera}
              className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
            >
              ● Record video
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 border border-[#2c2416] text-[#2c2416] hover:bg-[#2c2416] hover:text-[#f5f1e8] transition text-xs tracking-[0.2em] uppercase"
            >
              ↑ Upload a video
            </button>
          </>
        )}
        {stage === 'live' && (
          <>
            <button
              onClick={startRecording}
              className="px-5 py-3 bg-[#c0392b] text-[#f5f1e8] hover:opacity-90 transition text-xs tracking-[0.2em] uppercase"
            >
              ● Start recording
            </button>
            <button
              onClick={() => {
                stopCamera()
                setStage('idle')
              }}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
            >
              Stop camera
            </button>
          </>
        )}
        {stage === 'recording' && (
          <button
            onClick={stopRecording}
            className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
          >
            ■ Stop
          </button>
        )}
        {stage === 'review' && (
          <div className="w-full">
            {/* Trim handles. Lets the user cut awkward "I'm reaching for the
                stop button" tails off the front and back without re-encoding
                the file. Persisted alongside the media URL; viewers enforce
                the bounds on playback. */}
            {seconds > 0 && (
              <TrimSlider
                durationSec={seconds}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onChange={(s, e) => {
                  setTrimStart(s)
                  setTrimEnd(e)
                }}
              />
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={acceptAndUpload}
                className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
              >
                ✓ Accept &amp; save
              </button>
              <button
                onClick={redo}
                className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
              >
                {source === 'record' ? '↻ Redo' : '↻ Pick another'}
              </button>
            </div>
          </div>
        )}
        {stage === 'uploading' && (
          <p className="text-sm font-serif italic text-[#5c4d2e]">
            Uploading your video…
          </p>
        )}
        {stage === 'done' && previewUrl && (
          <>
            <button
              onClick={() => {
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
                setRecordedBlob(null)
                setSeconds(0)
                startCamera()
              }}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
            >
              ● Record again
            </button>
            <button
              onClick={() => {
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
                setRecordedBlob(null)
                setSeconds(0)
                setStage('idle')
                setTimeout(() => fileInputRef.current?.click(), 0)
              }}
              className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
            >
              ↑ Upload another
            </button>
          </>
        )}
        {stage === 'error' && (
          <button
            onClick={() => {
              setErrorMsg(null)
              setStage('idle')
            }}
            className="px-5 py-3 border border-[#c0392b]/40 text-[#c0392b] hover:bg-[#c0392b]/5 transition text-xs tracking-[0.2em] uppercase"
          >
            Try again
          </button>
        )}
      </div>

      {errorMsg && (
        <p className="mt-3 text-xs text-[#c0392b] italic">{errorMsg}</p>
      )}
    </div>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Probe a video file via a hidden element to get duration + dimensions. */
function measureVideo(
  url: string
): Promise<{ duration: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.muted = true
    el.playsInline = true
    el.onloadedmetadata = () => {
      const duration = isFinite(el.duration) ? el.duration : 0
      const ratio =
        el.videoWidth > 0 && el.videoHeight > 0
          ? el.videoWidth / el.videoHeight
          : 16 / 9
      resolve({ duration, aspectRatio: ratio })
    }
    el.onerror = () => reject(new Error('Could not load video metadata'))
    el.src = url
  })
}

/**
 * Subtle oscillating dot rendered above the camera frame. Anchored to the
 * top center of the video surface so the user's gaze drifts upward — closer
 * to where the actual camera lens sits on most laptops and phones. Glow
 * fades in and out at a slow pace so it's a soft target, not a distraction.
 */
function FocusDot() {
  return (
    <motion.div
      animate={{
        scale: [1, 1.15, 1],
        boxShadow: [
          '0 0 8px 2px rgba(139, 111, 58, 0.4)',
          '0 0 16px 5px rgba(139, 111, 58, 0.7)',
          '0 0 8px 2px rgba(139, 111, 58, 0.4)',
        ],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-[#8b6f3a]"
      aria-hidden="true"
    />
  )
}

interface TrimSliderProps {
  durationSec: number
  trimStart: number | null
  trimEnd: number | null
  onChange: (start: number | null, end: number | null) => void
}

/**
 * Two-handle range slider for trimming the front and back of a recorded
 * clip. Doesn't actually re-encode anything — sets `trimStart`/`trimEnd`
 * that get stored alongside the media and enforced on playback.
 *
 * Handles snap to whole seconds. Minimum gap between handles is 1 second
 * so you can't trim away the entire video. Showing "0:03 — 0:42 (39 sec)"
 * keeps users oriented in what the recipient will actually see.
 */
function TrimSlider({ durationSec, trimStart, trimEnd, onChange }: TrimSliderProps) {
  // Defaults: 0 and full duration. Internally we always track concrete
  // numbers; we expose nulls to the parent only when the user hasn't
  // trimmed from that side (so a "no trim" state can be persisted as nulls).
  const effectiveStart = trimStart ?? 0
  const effectiveEnd = trimEnd ?? durationSec

  // Snap to integers
  const snap = (n: number) => Math.round(Math.max(0, Math.min(durationSec, n)))

  const handleStartChange = (raw: string) => {
    const n = snap(Number(raw))
    const next = Math.min(n, effectiveEnd - 1)
    onChange(next > 0 ? next : null, trimEnd)
  }
  const handleEndChange = (raw: string) => {
    const n = snap(Number(raw))
    const next = Math.max(n, effectiveStart + 1)
    onChange(trimStart, next < durationSec ? next : null)
  }

  const reset = () => onChange(null, null)
  const isTrimmed = trimStart !== null || trimEnd !== null
  const visibleSeconds = effectiveEnd - effectiveStart

  return (
    <div className="border-t border-[#2c2416]/15 pt-4 mt-2">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]">
          Trim (optional)
        </p>
        <p className="text-[10px] italic text-[#5c4d2e]/70 tabular-nums">
          {formatDuration(effectiveStart)} – {formatDuration(effectiveEnd)}
          {' · '}
          {visibleSeconds}s
        </p>
      </div>

      {/* Two range inputs stacked. Browser native — keeps it accessible
          and works fine for whole-second precision. Custom-styled handles
          would be nicer visually but cost a lot more code. */}
      <div className="space-y-2">
        <label className="block">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#5c4d2e]/70 mr-3 inline-block w-12">
            Start
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, durationSec - 1)}
            step={1}
            value={effectiveStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className="align-middle inline-block w-[calc(100%-4rem)] accent-[#8b6f3a]"
            aria-label="Trim start"
          />
        </label>
        <label className="block">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#5c4d2e]/70 mr-3 inline-block w-12">
            End
          </span>
          <input
            type="range"
            min={1}
            max={durationSec}
            step={1}
            value={effectiveEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            className="align-middle inline-block w-[calc(100%-4rem)] accent-[#8b6f3a]"
            aria-label="Trim end"
          />
        </label>
      </div>

      {isTrimmed && (
        <button
          type="button"
          onClick={reset}
          className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
        >
          ↺ Reset (play full video)
        </button>
      )}
    </div>
  )
}

