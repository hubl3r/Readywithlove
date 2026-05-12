// components/SettingsProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

export type FontScale = 'small' | 'normal' | 'large' | 'xlarge'
export type PageTurnStyle = 'fade' | 'curl'

export interface AppSettings {
  pageTurnStyle: PageTurnStyle
  fontScale: FontScale
  highContrast: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
  reducedMotion: boolean
  /** Zip 2c.3 — preferred TTS voice (voiceURI string), null = auto-pick */
  preferredVoiceURI: string | null
}

// Defaults for signed-in users on first run. Match the API's create defaults.
const DEFAULT_SETTINGS: AppSettings = {
  pageTurnStyle: 'fade',
  fontScale: 'normal',
  highContrast: false,
  ttsEnabled: false,
  sttEnabled: false,
  reducedMotion: false,
  preferredVoiceURI: null,
}

// Defaults for UNAUTHED users (contributors on /contribute/[token]).
// Per Zip 2c.3 spec: TTS/STT always on for contributors so they can use
// read-aloud and dictation without needing a setting they don't have access to.
const CONTRIBUTOR_DEFAULTS: AppSettings = {
  ...DEFAULT_SETTINGS,
  ttsEnabled: true,
  sttEnabled: true,
}

interface SettingsContextValue {
  settings: AppSettings
  loading: boolean
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refresh: async () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

/**
 * Wraps the app, fetches the signed-in user's settings, applies them globally
 * via data-* attributes on <html>, and exposes them to children.
 *
 * For unauthed visitors (contributors), we apply CONTRIBUTOR_DEFAULTS instead
 * of DEFAULT_SETTINGS. This is what makes TTS/STT always-available on the
 * contribute page without needing toggles they can't see.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!isSignedIn) {
      // Unauthed = contributor flow. Give them the always-on defaults so
      // LetterEditor's TTS/STT buttons appear.
      setSettings(CONTRIBUTOR_DEFAULTS)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = (await res.json()) as Partial<AppSettings>
        setSettings({ ...DEFAULT_SETTINGS, ...data })
      }
    } catch (err) {
      console.error('[settings] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isLoaded) return
    fetchSettings()
  }, [isLoaded, fetchSettings])

  // Apply globally — data attributes drive CSS in globals.css
  useEffect(() => {
    const root = document.documentElement
    root.dataset.fontScale = settings.fontScale
    root.dataset.highContrast = settings.highContrast ? 'true' : 'false'
    root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false'
  }, [settings.fontScale, settings.highContrast, settings.reducedMotion])

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
