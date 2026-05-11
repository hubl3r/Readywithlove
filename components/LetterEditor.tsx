// components/LetterEditor.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useSettings } from '@/components/SettingsProvider'
import { speak, stopSpeaking, createRecognizer, TTS_SUPPORTED, STT_SUPPORTED } from '@/lib/speech'

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
  const recognizerRef = useRef<SpeechRecognitionLite | null>(null)

  // STT: append finalized transcript chunks to the textarea
  const startDictation = () => {
    const rec = createRecognizer() as unknown as SpeechRecognitionLite | null
    if (!rec) return
    recognizerRef.current = rec
    setDictating(true)

    let accumulated = value
    let lastFinalLen = accumulated.length

    rec.onresult = (ev: Event) => {
      // SpeechRecognitionEvent — narrowed shape
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
        // Append final text + a space, then mark a checkpoint so interim doesn't pile on
        accumulated = (accumulated.slice(0, lastFinalLen) + (lastFinalLen ? ' ' : '') + finalText).trimStart()
        lastFinalLen = accumulated.length
      }
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

  const toggleRead = () => {
    if (reading) {
      stopSpeaking()
      setReading(false)
      return
    }
    if (!value.trim()) return
    setReading(true)
    speak({
      text: value,
      onEnd: () => setReading(false),
      onError: () => setReading(false),
    })
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
        {settings.ttsEnabled && !TTS_SUPPORTED && (
          <span className="text-[10px] italic text-[#5c4d2e]/60">read-aloud not supported in this browser</span>
        )}
        {settings.sttEnabled && !STT_SUPPORTED && (
          <span className="text-[10px] italic text-[#5c4d2e]/60">dictation not supported in this browser</span>
        )}
        {(!settings.ttsEnabled && !settings.sttEnabled) && (
          <span className="text-[10px] italic text-[#5c4d2e]/40">
            Enable read-aloud or dictation in Settings to use here
          </span>
        )}
      </div>
    </div>
  )
}
