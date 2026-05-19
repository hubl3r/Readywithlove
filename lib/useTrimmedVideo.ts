// lib/useTrimmedVideo.ts
//
// Apply trim bounds to a <video> element by jumping past the trim start on
// load and pausing+seeking when reaching the trim end. The underlying file
// isn't trimmed — only the playback experience is.
//
// Zip 2c.5 hotfix 4: extends the `seeked` listener to catch user scrubs
// BEFORE the trim start, not just past the trim end. Previously a user who
// rewound the seek bar would land at 0 (or anywhere in the trimmed-out
// front portion) and replay would start from there instead of trim start.
//
// Internal use of a "we just snapped" flag (`programmaticSeekRef`) prevents
// our own snap calls from triggering the seeked handler recursively.

'use client'

import { useEffect, useRef } from 'react'

const END_EPSILON = 0.15

export function useTrimmedVideo(
  trimStartSec: number | null | undefined,
  trimEndSec: number | null | undefined
) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const start = typeof trimStartSec === 'number' && trimStartSec > 0 ? trimStartSec : null
    const end = typeof trimEndSec === 'number' && trimEndSec > 0 ? trimEndSec : null

    if (start === null && end === null) return

    let appliedStart = false
    // Flag set when the hook itself triggers a seek, so the seeked handler
    // doesn't react to its own snap and create a loop.
    let programmaticSeek = false

    const safeSeek = (target: number) => {
      programmaticSeek = true
      try {
        el.currentTime = target
      } catch {
        /* ignore */
      }
      // Clear flag after the seeked event has a chance to fire
      window.setTimeout(() => {
        programmaticSeek = false
      }, 50)
    }

    const tryApplyStart = () => {
      if (appliedStart || start === null) return
      if (el.readyState < 2) return
      if (el.currentTime > start + 0.5 && !el.paused) {
        appliedStart = true
        return
      }
      safeSeek(start)
      appliedStart = true
    }

    const onLoadedData = () => tryApplyStart()
    const onCanPlay = () => tryApplyStart()
    const onPlay = () => tryApplyStart()

    const onSeeked = () => {
      if (programmaticSeek) return
      // User scrubbed past the trim end — snap them back to it
      if (end !== null && el.currentTime > end + END_EPSILON) {
        safeSeek(end)
        return
      }
      // Zip 2c.5 hotfix 4 (A): user scrubbed before the trim start — snap
      // them forward. This is the fix for "rewind goes to beginning of
      // whole video not beginning of trim".
      if (start !== null && el.currentTime < start - END_EPSILON) {
        safeSeek(start)
      }
    }

    const onTimeUpdate = () => {
      if (end !== null && el.currentTime >= end - END_EPSILON) {
        el.pause()
        safeSeek(end)
      }
    }

    el.addEventListener('loadeddata', onLoadedData)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('play', onPlay)

    tryApplyStart()

    return () => {
      el.removeEventListener('loadeddata', onLoadedData)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('play', onPlay)
    }
  }, [trimStartSec, trimEndSec])

  return ref
}

/**
 * Variant that binds to an existing video ref (used by VideoRecorder for
 * the preview, where the component already owns the ref for metadata
 * measurement). Same playback enforcement, same snap-on-rewind behavior.
 */
export function useTrimmedVideoOnRef(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  trimStartSec: number | null | undefined,
  trimEndSec: number | null | undefined
) {
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const start = typeof trimStartSec === 'number' && trimStartSec > 0 ? trimStartSec : null
    const end = typeof trimEndSec === 'number' && trimEndSec > 0 ? trimEndSec : null

    if (start === null && end === null) return

    let appliedStart = false
    let programmaticSeek = false

    const safeSeek = (target: number) => {
      programmaticSeek = true
      try {
        el.currentTime = target
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        programmaticSeek = false
      }, 50)
    }

    const tryApplyStart = () => {
      if (appliedStart || start === null) return
      if (el.readyState < 2) return
      if (el.currentTime > start + 0.5 && !el.paused) {
        appliedStart = true
        return
      }
      safeSeek(start)
      appliedStart = true
    }

    const onLoadedData = () => tryApplyStart()
    const onCanPlay = () => tryApplyStart()
    const onPlay = () => tryApplyStart()

    const onSeeked = () => {
      if (programmaticSeek) return
      if (end !== null && el.currentTime > end + END_EPSILON) {
        safeSeek(end)
        return
      }
      if (start !== null && el.currentTime < start - END_EPSILON) {
        safeSeek(start)
      }
    }

    const onTimeUpdate = () => {
      if (end !== null && el.currentTime >= end - END_EPSILON) {
        el.pause()
        safeSeek(end)
      }
    }

    el.addEventListener('loadeddata', onLoadedData)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('play', onPlay)

    tryApplyStart()

    return () => {
      el.removeEventListener('loadeddata', onLoadedData)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('play', onPlay)
    }
  }, [videoRef, trimStartSec, trimEndSec])
}
