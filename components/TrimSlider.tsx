// components/TrimSlider.tsx
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

/**
 * Two-handle range slider for setting playback bounds on a video.
 * Doesn't re-encode anything — produces `trimStart` / `trimEnd` values
 * that get stored alongside the media. Viewers enforce the bounds via
 * the useTrimmedVideo hook.
 *
 * Zip 2c.5 hotfix 5:
 *  - Steps in 0.25-second increments (was whole seconds).
 *  - Tick marks like a ruler below the sliders: minor ticks every 0.25s,
 *    major ticks every second, labeled at 5-second intervals (or every
 *    second if the clip is short).
 *
 * Storage: server columns are `Int` (whole seconds). We round to whole
 * seconds at save time so the rest of the system doesn't have to care.
 * The slider lets users be more precise during selection, but persisted
 * values stay coarse. If we ever switch the columns to Float, drop the
 * Math.round in scheduleSave/handleX.
 *
 * Modes (unchanged from earlier hotfix):
 *  - patchEndpoint set → auto-save with 600ms debounce
 *  - patchEndpoint omitted → parent owns persistence
 */

interface TrimSliderProps {
  durationSec: number
  trimStart: number | null
  trimEnd: number | null
  onChange: (start: number | null, end: number | null) => void
  patchEndpoint?: string
  className?: string
}

const STEP_SEC = 0.25

export function TrimSlider({
  durationSec,
  trimStart,
  trimEnd,
  onChange,
  patchEndpoint,
  className = '',
}: TrimSliderProps) {
  const effectiveStart = trimStart ?? 0
  const effectiveEnd = trimEnd ?? durationSec

  // Quantize to the nearest 0.25-second step
  const snap = (n: number) => {
    const clamped = Math.max(0, Math.min(durationSec, n))
    return Math.round(clamped / STEP_SEC) * STEP_SEC
  }

  // Server stores whole seconds (Int columns) — round on persist
  const toStorage = (v: number | null): number | null =>
    v === null ? null : Math.round(v)

  // Debounced save state
  const saveTimeoutRef = useRef<number | null>(null)
  const pendingValuesRef = useRef<{ start: number | null; end: number | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const scheduleSave = (start: number | null, end: number | null) => {
    if (!patchEndpoint) return
    pendingValuesRef.current = { start, end }
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      const values = pendingValuesRef.current
      if (!values) return
      setSaving(true)
      setSaveError(null)
      try {
        const res = await fetch(patchEndpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaTrimStartSec: toStorage(values.start),
            mediaTrimEndSec: toStorage(values.end),
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || `Save failed (${res.status})`)
        }
        setSavedAt(Date.now())
      } catch (err) {
        setSaveError((err as Error).message)
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  const handleStartChange = (raw: string) => {
    const n = snap(Number(raw))
    // Keep at least 1s of visible content between handles
    const nextStart = Math.min(n, effectiveEnd - 1)
    const start = nextStart > 0 ? nextStart : null
    onChange(start, trimEnd)
    scheduleSave(start, trimEnd)
  }
  const handleEndChange = (raw: string) => {
    const n = snap(Number(raw))
    const nextEnd = Math.max(n, effectiveStart + 1)
    const end = nextEnd < durationSec ? nextEnd : null
    onChange(trimStart, end)
    scheduleSave(trimStart, end)
  }

  const reset = () => {
    onChange(null, null)
    scheduleSave(null, null)
  }

  const isTrimmed = trimStart !== null || trimEnd !== null
  const visibleSeconds = (effectiveEnd - effectiveStart).toFixed(
    // Show 2 decimals if the result isn't a whole number, else 0
    Number.isInteger(effectiveEnd - effectiveStart) ? 0 : 2
  )

  // Build tick marks. Strategy: a major tick every whole second, minor ticks
  // every 0.25s. Labels every 5s if the clip is >20s long, else every second.
  // We render ticks as a row of absolutely-positioned divs over a relative
  // container so they align with the slider track underneath.
  const labelEverySec = durationSec > 20 ? 5 : 1
  const tickRows = useMemo(() => {
    const minors: number[] = []
    const majors: number[] = []
    const labels: { sec: number }[] = []
    // 0.25s ticks
    for (let t = 0; t <= durationSec + 1e-6; t += STEP_SEC) {
      const rounded = Math.round(t * 4) / 4
      if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
        majors.push(rounded)
      } else {
        minors.push(rounded)
      }
    }
    for (let s = 0; s <= durationSec; s += labelEverySec) {
      labels.push({ sec: s })
    }
    // Always include the very end label if it didn't land on the interval
    if (
      labels.length === 0 ||
      Math.abs(labels[labels.length - 1].sec - durationSec) > 1e-6
    ) {
      labels.push({ sec: durationSec })
    }
    return { minors, majors, labels }
  }, [durationSec, labelEverySec])

  const saveIndicator = (() => {
    if (!patchEndpoint) return null
    if (saving) return <span className="text-[#8b6f3a] italic">saving…</span>
    if (saveError) return <span className="text-[#c0392b] italic">{saveError}</span>
    if (savedAt && Date.now() - savedAt < 3000) {
      return <span className="text-green-700 italic">saved</span>
    }
    return null
  })()

  return (
    <div className={`border-t border-[#2c2416]/15 pt-4 mt-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a]">
          Trim (optional)
        </p>
        <p className="text-[10px] italic text-[#5c4d2e]/70 tabular-nums flex items-center gap-3">
          <span>
            {formatTime(effectiveStart)} – {formatTime(effectiveEnd)}
            {' · '}
            {visibleSeconds}s
          </span>
          {saveIndicator}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#5c4d2e]/70 mr-3 inline-block w-12">
            Start
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, durationSec - 1)}
            step={STEP_SEC}
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
            step={STEP_SEC}
            value={effectiveEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            className="align-middle inline-block w-[calc(100%-4rem)] accent-[#8b6f3a]"
            aria-label="Trim end"
          />
        </label>

        {/* Tick ruler. Native slider thumbs span the full width minus their
            own size, so absolute positioning over the track is approximate
            — close enough for visual reference. */}
        <div className="pl-12 pr-2">
          <div className="relative h-6">
            {tickRows.minors.map((t) => (
              <div
                key={`min-${t}`}
                className="absolute top-0 w-px h-1.5 bg-[#5c4d2e]/30"
                style={{ left: `${(t / durationSec) * 100}%` }}
              />
            ))}
            {tickRows.majors.map((t) => (
              <div
                key={`maj-${t}`}
                className="absolute top-0 w-px h-2.5 bg-[#5c4d2e]/60"
                style={{ left: `${(t / durationSec) * 100}%` }}
              />
            ))}
            {tickRows.labels.map(({ sec }) => (
              <div
                key={`lab-${sec}`}
                className="absolute top-3 text-[9px] tabular-nums text-[#5c4d2e]/70 -translate-x-1/2"
                style={{ left: `${(sec / durationSec) * 100}%` }}
              >
                {formatTime(sec)}
              </div>
            ))}
          </div>
        </div>
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

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  // Show fractional seconds when present
  const sStr = Number.isInteger(r) ? r.toString() : r.toFixed(2)
  return `${m}:${r < 10 ? '0' + sStr : sStr}`
}
