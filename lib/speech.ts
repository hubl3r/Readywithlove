// lib/speech.ts
//
// Thin client-side wrappers around the browser Web Speech APIs.
// - TTS uses SpeechSynthesis (widely supported)
// - STT uses SpeechRecognition (Chrome/Edge/Safari only; Firefox doesn't)
//
// These are framework-agnostic — see useTTS/useSTT hooks for React versions.

export const TTS_SUPPORTED =
  typeof window !== 'undefined' && 'speechSynthesis' in window

export const STT_SUPPORTED =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

export interface SpeakOptions {
  text: string
  rate?: number              // 0.1..10, default 1
  pitch?: number             // 0..2, default 1
  voice?: SpeechSynthesisVoice
  onEnd?: () => void
  onError?: (e: SpeechSynthesisErrorEvent) => void
}

export function speak({ text, rate, pitch, voice, onEnd, onError }: SpeakOptions): SpeechSynthesisUtterance | null {
  if (!TTS_SUPPORTED) return null
  // Always cancel anything currently playing — overlap is jarring.
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  if (rate) utt.rate = rate
  if (pitch) utt.pitch = pitch
  if (voice) utt.voice = voice
  if (onEnd) utt.onend = onEnd
  if (onError) utt.onerror = onError
  window.speechSynthesis.speak(utt)
  return utt
}

export function stopSpeaking() {
  if (!TTS_SUPPORTED) return
  window.speechSynthesis.cancel()
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!TTS_SUPPORTED) return []
  return window.speechSynthesis.getVoices()
}

// --- STT ---------------------------------------------------------------

type SRConstructor = new () => SpeechRecognition

// SpeechRecognition isn't in the standard DOM lib in TS yet — declare what we need.
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

export function createRecognizer(): SpeechRecognition | null {
  if (!STT_SUPPORTED) return null
  const Ctor =
    (window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SRConstructor }).webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = true
  return rec
}
