// lib/speech.ts
//
// Thin client-side wrappers around the browser Web Speech APIs.
// - TTS uses SpeechSynthesis (widely supported)
// - STT uses SpeechRecognition (Chrome/Edge/Safari only; Firefox doesn't)
//
// Zip 2c.3: TTS now accepts a preferredVoiceURI and falls back to ranking.

import { pickVoice, waitForVoices } from './voicePicker'

export const TTS_SUPPORTED =
  typeof window !== 'undefined' && 'speechSynthesis' in window

export const STT_SUPPORTED =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

export interface SpeakOptions {
  text: string
  rate?: number              // 0.1..10, default 0.95 (slightly slower than default — more natural for emotional content)
  pitch?: number             // 0..2, default 1
  voice?: SpeechSynthesisVoice
  /**
   * Stored voice URI (from Settings). If provided, the speak() helper
   * will resolve it to a voice via voicePicker.pickVoice. Takes precedence
   * over `voice` only when `voice` is undefined.
   */
  preferredVoiceURI?: string | null
  onEnd?: () => void
  onError?: (e: SpeechSynthesisErrorEvent) => void
}

/**
 * Speak some text. Auto-selects the best available voice unless overridden.
 * Asynchronous because voice list loading is async on most browsers.
 */
export async function speak({
  text,
  rate = 0.95,
  pitch = 1,
  voice,
  preferredVoiceURI,
  onEnd,
  onError,
}: SpeakOptions): Promise<SpeechSynthesisUtterance | null> {
  if (!TTS_SUPPORTED) return null
  // Always cancel anything currently playing — overlap is jarring
  window.speechSynthesis.cancel()

  // Resolve voice. Caller may pass explicit voice, OR a preferred URI to
  // look up, OR neither (use best ranked default).
  let chosen: SpeechSynthesisVoice | null = voice ?? null
  if (!chosen) {
    const voices = await waitForVoices()
    chosen = pickVoice(voices, preferredVoiceURI ?? null)
  }

  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = rate
  utt.pitch = pitch
  if (chosen) utt.voice = chosen
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
