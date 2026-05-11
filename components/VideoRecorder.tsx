// components/VideoRecorder.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { upload } from '@vercel/blob/client'

type Stage = 'idle' | 'requesting' | 'live' | 'recording' | 'review' | 'uploading' | 'done' | 'error'

interface VideoRecorderProps {
  messageId: string
  onUploaded: (url: string, durationSec: number) => void
  initialVideoUrl?: string | null
  maxSeconds?: number
}

const DEFAULT_MAX_SECONDS = 10 * 60

/**
 * MediaRecorder-based video recorder with:
 *   - Always-rendered <video> element (fixes a race where srcObject was set
 *     on a not-yet-mounted ref). Crucially, this is what makes the live
 *     preview actually show DURING recording on iOS Safari too.
 *   - playsInline + muted on the self-view (required for iOS autoplay)
 *   - Accept / Redo flow on review, persistent "Record again" after upload
 *   - Vercel Blob direct client upload (bypasses Vercel's 4.5MB function limit)
 */
export function VideoRecorder({
  messageId,
  onUploaded,
  initialVideoUrl,
  maxSeconds = DEFAULT_MAX_SECONDS,
}: VideoRecorderProps) {
  const [stage, setStage] = useState<Stage>(initialVideoUrl ? 'done' : 'idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideoUrl ?? null)

  // Both surfaces are always rendered now; we toggle which is visible via CSS.
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }
  }, [])

  // Cleanup on unmount
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
    setStage('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      // Element is always rendered, so the ref is real. Attach immediately.
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        // iOS quirk: play() may need to be awaited explicitly, and may
        // return a rejected promise even after autoplay. Swallow gracefully.
        try {
          await liveVideoRef.current.play()
        } catch {
          // Element will still display the stream; play state is best-effort
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

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    setSeconds(0)

    // Pick the best supported MIME type; browsers vary.
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4', // iOS Safari produces this
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
    startCamera()
  }

  const acceptAndUpload = async () => {
    if (!recordedBlob) return
    setStage('uploading')
    try {
      const ext = (recordedBlob.type.split('/')[1] || 'webm').split(';')[0]
      const filename = `videos/${messageId}/${Date.now()}.${ext}`

      const blob = await upload(filename, recordedBlob, {
        access: 'public',
        handleUploadUrl: `/api/messages/${messageId}/upload-url`,
        contentType: recordedBlob.type,
      })

      // Fallback for localhost (onUploadCompleted server callback doesn't
      // fire there): PATCH the message with the URL directly.
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: blob.url,
          mediaBlobPath: blob.pathname,
          mediaDurationSec: seconds,
        }),
      })

      onUploaded(blob.url, seconds)
      setStage('done')
    } catch (err) {
      setErrorMsg(`Upload failed: ${(err as Error).message}`)
      setStage('error')
    }
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  // Which surface to show. Done if it's idle, the LIVE element is rendered
  // but hidden (camera not started). Same in 'requesting'. Review/done show
  // the recorded preview.
  const showLive = stage === 'requesting' || stage === 'live' || stage === 'recording'
  const showReview = stage === 'review' || stage === 'done' || stage === 'uploading'

  return (
    <div className="w-full">
      {/* Video surface — both elements always mounted; visibility toggled */}
      <div className="relative aspect-video bg-black overflow-hidden border border-[#2c2416]/20">
        <video
          ref={liveVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
            showLive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
        {showReview && previewUrl && (
          <video
            ref={reviewVideoRef}
            src={previewUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
        {stage === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center text-[#f5f1e8]/60 italic font-serif text-lg">
            Camera will appear here
          </div>
        )}
        {stage === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center text-[#f5f1e8]/80 italic font-serif">
            Asking your browser for camera access…
          </div>
        )}

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
              REC {fmt(seconds)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-3">
        {stage === 'idle' && (
          <button
            onClick={startCamera}
            className="px-5 py-3 bg-[#2c2416] text-[#f5f1e8] hover:bg-[#8b6f3a] transition text-xs tracking-[0.2em] uppercase"
          >
            Start camera
          </button>
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
          <>
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
              ↻ Redo
            </button>
          </>
        )}
        {stage === 'uploading' && (
          <p className="text-sm font-serif italic text-[#5c4d2e]">
            Uploading your video…
          </p>
        )}
        {stage === 'done' && previewUrl && (
          <button
            onClick={redo}
            className="px-5 py-3 border border-[#2c2416]/30 hover:border-[#2c2416] transition text-xs tracking-[0.2em] uppercase"
          >
            Record again
          </button>
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
