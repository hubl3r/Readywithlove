// lib/useTrimmedVideo.ts
//
// Apply trim bounds to a <video> element by jumping past the trim start on
// load and pausing+seeking when reaching the trim end. The underlying file
// isn't trimmed — only the playback experience is.
//
// Use as:
//   const videoRef = useTrimmedVideo(mediaTrimStartSec, mediaTrimEndSec)
//   return <video ref={videoRef} src={...} controls />
//
// Null trim values are no-ops. The hook is safe to call with either or
// both null.

'use client'

import { useEffect, useRef } from 'react'

export function useTrimmedVideo(
  trimStartSec: number | null | undefined,
  trimEndSec: number | null | undefined
) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onLoaded = () => {
      if (typeof trimStartSec === 'number' && trimStartSec > 0) {
        // Jump past the trimmed front. Browsers may clamp seek to nearest
        // keyframe, which is fine — close enough for the recipient.
        try {
          el.currentTime = trimStartSec
        } catch {
          /* element may not be ready in some Safari edge cases */
        }
      }
    }
    const onTimeUpdate = () => {
      if (
        typeof trimEndSec === 'number' &&
        trimEndSec > 0 &&
        el.currentTime >= trimEndSec
      ) {
        // Pause + snap back to the trim end so the controls show the end
        // of the visible region rather than running into untrimmed footage.
        el.pause()
        try {
          el.currentTime = trimEndSec
        } catch {
          /* ignore */
        }
      }
    }

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('timeupdate', onTimeUpdate)

    // If metadata is already loaded by the time we attach (e.g. cached),
    // run the start-jump manually so we don't miss it.
    if (el.readyState >= 1) onLoaded()

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [trimStartSec, trimEndSec])

  return ref
}
