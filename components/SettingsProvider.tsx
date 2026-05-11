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
}

const DEFAULT_SETTINGS: AppSettings = {
  pageTurnStyle: 'fade',
  fontScale: 'normal',
  highContrast: false,
  ttsEnabled: false,
  sttEnabled: false,
  reducedMotion: false,
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
 * Why data attributes instead of CSS variables here: it lets the CSS in
 * globals.css drive both font-scale AND high-contrast theming without React
 * needing to touch every element.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!isSignedIn) {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = (await res.json()) as AppSettings
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
