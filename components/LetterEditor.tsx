// components/LetterEditor.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useSettings } from '@/components/SettingsProvider'
import { speak, stopSpeaking, createRecognizer, TTS_SUPPORTED, STT_SUPPORTED } from '@/lib/speech'
import { applySpokenPunctuation, capitalizeFirst } from '@/lib/dictationCleanup'

interface LetterEditorProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
}

interface SpeechRecognitionLite extends EventTarget {
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: Event) => void) | null
  onend: (() => void) | null
  onerror: ((ev: Event) => void) | null
}

export function LetterEditor({
  value,
  onChange,
  placeholder = 'Dear loved one…',
  rows = 12,
}: LetterEditorProps) {
  const { settings } = useSettings()
  const [reading, setReading] = useState(false)
  const [dictating, setDictating] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null)
  const recognizerRef = useRef<SpeechRecognitionLite | null>(null)

  // STT: append finalized transcript chunks to the textarea.
  // Zip 2c.3: every final chunk runs through applySpokenPunctuation so
  // users can say "comma" or "new paragraph" and get the right mark.
  const startDictation = () => {
    const rec = createRecognizer() as unknown as SpeechRecognitionLite | null
    if (!rec) return
    recognizerRef.current = rec
    setDictating(true)

    let accumulated = value
    let lastFinalLen = accumulated.length

    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
      }
      let interim = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      if (finalText) {
        // Apply spoken-punctuation rules to the finalized chunk
        const cleaned = applySpokenPunctuation(finalText)
        // Capitalize the first char if this is the first content
        const toAppend = !lastFinalLen ? capitalizeFirst(cleaned.trimStart()) : cleaned
        const sep = lastFinalLen && !accumulated.endsWith('\n') && !cleaned.startsWith('\n') ? ' ' : ''
        accumulated = (accumulated.slice(0, lastFinalLen) + sep + toAppend).trimStart()
        lastFinalLen = accumulated.length
      }
      // For interim text, don't transform — would feel weird to see "comma"
      // disappear mid-display. Spoken punctuation only fires on final.
      const next = interim
        ? `${accumulated}${accumulated && interim ? ' ' : ''}${interim}`
        : accumulated
      onChange(next)
    }

    rec.onerror = () => setDictating(false)
    rec.onend = () => setDictating(false)
    rec.start()
  }

  const stopDictation = () => {
    recognizerRef.current?.stop()
    setDictating(false)
  }

  const toggleRead = async () => {
    if (reading) {
      stopSpeaking()
      setReading(false)
      return
    }
    if (!value.trim()) return
    setReading(true)
    await speak({
      text: value,
      preferredVoiceURI: settings.preferredVoiceURI,
      onEnd: () => setReading(false),
      onError: () => setReading(false),
    })
  }

  // AI cleanup — sends text to the locked-down /api/ai/cleanup-text endpoint.
  // Works for both authed users and unauthed contributors.
  const runCleanup = async () => {
    if (!value.trim() || cleaningUp) return
    setCleaningUp(true)
    setCleanupMsg(null)
    try {
      const res = await fetch('/api/ai/cleanup-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCleanupMsg(data.error || 'Cleanup failed')
        return
      }
      if (data.changed === false) {
        setCleanupMsg('No changes suggested.')
      } else {
        onChange(data.text)
        setCleanupMsg('Cleaned up.')
        // Clear the success message after a moment
        setTimeout(() => setCleanupMsg(null), 2500)
      }
    } catch {
      setCleanupMsg('Could not reach the cleanup service.')
    } finally {
      setCleaningUp(false)
    }
  }

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
      recognizerRef.current?.abort?.()
    }
  }, [])

  const ttsAvailable = TTS_SUPPORTED && settings.ttsEnabled
  const sttAvailable = STT_SUPPORTED && settings.sttEnabled

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-transparent border border-[#2c2416]/30 focus:border-[#8b6f3a] outline-none p-4 font-serif text-base md:text-lg leading-relaxed resize-y text-[#2c2416]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {ttsAvailable && (
          <button
            type="button"
            onClick={toggleRead}
            disabled={!value.trim()}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] disabled:opacity-30 transition"
          >
            {reading ? '■ Stop reading' : '🔊 Read aloud'}
          </button>
        )}
        {sttAvailable && (
          <button
            type="button"
            onClick={dictating ? stopDictation : startDictation}
            className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] transition"
          >
            {dictating ? '● Listening… click to stop' : '🎙 Dictate'}
          </button>
        )}

        {/* AI cleanup button — always shown (no setting gate, since it's
            also useful for unauth contributors). Only enabled when there's
            text to clean up. */}
        <button
          type="button"
          onClick={runCleanup}
          disabled={!value.trim() || cleaningUp}
          title="Use AI to clean up punctuation and grammar"
          className="text-[10px] tracking-[0.2em] uppercase text-[#8b6f3a] hover:text-[#2c2416] disabled:opacity-30 transition"
        >
          {cleaningUp ? '✨ Cleaning up…' : '✨ Polish with AI'}
        </button>

        {cleanupMsg && (
          <span className="text-[10px] italic text-[#5c4d2e]/80">{cleanupMsg}</span>
        )}

        {settings.ttsEnabled && !TTS_SUPPORTED && (
          <span className="text-[10px] italic text-[#5c4d2e]/60">read-aloud not supported in this browser</span>
        )}
        {settings.sttEnabled && !STT_SUPPORTED && (
          <span className="text-[10px] italic text-[#5c4d2e]/60">dictation not supported in this browser</span>
        )}
      </div>

      {sttAvailable && (
        <p className="mt-2 text-[10px] italic text-[#8b6f3a]/60">
          Tip: say &ldquo;comma,&rdquo; &ldquo;period,&rdquo; &ldquo;new paragraph,&rdquo; or
          &ldquo;question mark&rdquo; to insert punctuation as you dictate.
        </p>
      )}
    </div>
  )
}
