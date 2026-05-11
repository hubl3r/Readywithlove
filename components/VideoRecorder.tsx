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
 * MediaRecorder-based video recorder.
 *
 * Design notes (Zip 2b.3):
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
  maxSeconds = DEFAULT_MAX_SECONDS,
}: VideoRecorderProps) {
  const [stage, setStage] = useState<Stage>(initialVideoUrl ? 'done' : 'idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideoUrl ?? null)
  // Measured aspect ratio of the active stream/recording (width / height).
  // Falls back to 16:9 until we have real numbers.
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9)

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
      // No width/height/frameRate constraints — let the device pick its
      // native preview. This is the fix for the iPhone over-zoom issue.
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

  // Update aspectRatio when the live video reports its actual dimensions
  const handleLiveMetadata = () => {
    const el = liveVideoRef.current
    if (!el) return
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      setAspectRatio(el.videoWidth / el.videoHeight)
    }
  }
  // Same for the recorded preview (in case the saved video is a different
  // orientation than what we measured live — e.g. user rotated mid-recording)
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

  const showLive = stage === 'requesting' || stage === 'live' || stage === 'recording'
  const showReview = stage === 'review' || stage === 'done' || stage === 'uploading'

  // Frame styling:
  //   - aspectRatio is measured from the actual stream
  //   - max-h-[60vh] keeps the controls visible without scrolling, even
  //     when the user holds a phone in landscape (where a wide aspect ratio
  //     would otherwise want to take the whole height)
  //   - For portrait video on desktop, max-w prevents a giant tall column
  const frameStyle: React.CSSProperties = {
    aspectRatio: `${aspectRatio}`,
    maxHeight: '60vh',
    maxWidth: aspectRatio < 1 ? '420px' : undefined, // cap portrait width
    margin: '0 auto', // center when narrower than container
  }

  return (
    <div className="w-full">
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
              REC {fmt(seconds)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Stop button — overlay so users on small screens can
            stop without scrolling */}
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

      {/* Controls below the surface — also available, just not the only way
          to stop a recording on a tiny screen */}
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
