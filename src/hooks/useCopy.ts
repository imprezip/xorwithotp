import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy text to the clipboard and show a short "Copied!" confirmation.
 * Falls back to a hidden textarea + `execCommand` when the async clipboard API
 * is unavailable (older browsers, or an insecure context).
 */
export function useCopy(resetAfterMs = 1600) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(
    async (text: string, key = 'default') => {
      const ok = await writeToClipboard(text)
      if (!ok) return false
      setCopiedKey(key)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiedKey(null), resetAfterMs)
      return true
    },
    [resetAfterMs],
  )

  return { copy, copiedKey }
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
