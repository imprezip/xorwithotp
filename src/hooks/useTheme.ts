import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'cryptolab-theme'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  // The inline script in index.html already set the class before first paint.
  if (document.documentElement.classList.contains('dark')) return 'dark'
  if (document.documentElement.classList.contains('light')) return 'light'
  return 'dark'
}

/**
 * Dark / light theme.
 *
 * - a stored preference always wins;
 * - otherwise `prefers-color-scheme` is followed, live;
 * - the class is toggled on `<html>` so Tailwind's `dark:` variants switch.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)
  const [hasPreference, setHasPreference] = useState<boolean>(() => readStoredTheme() !== null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.remove('light')
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    if (hasPreference) return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (event: MediaQueryListEvent) => setTheme(event.matches ? 'light' : 'dark')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [hasPreference])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
      setHasPreference(true)
    } catch {
      /* storage unavailable: the toggle still works for this session */
    }
  }, [theme])

  return { theme, toggle }
}
