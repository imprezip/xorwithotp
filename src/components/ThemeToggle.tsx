import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { playThemeTransition } from './themeTransition'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

/** Dark / light switch. Icon-only, so it carries an explicit accessible name. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={(event) => {
        // A keyboard activation has no pointer position, so the circle grows
        // from the middle of the button instead.
        const rect = event.currentTarget.getBoundingClientRect()
        const origin =
          event.detail === 0
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : { x: event.clientX, y: event.clientY }
        playThemeTransition(origin, next, onToggle)
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="btn btn-ghost h-10 w-10 shrink-0 !px-0"
    >
      <span
        aria-hidden="true"
        className="relative flex h-5 w-5 items-center justify-center"
      >
        <Sun
          size={17}
          className={`absolute transition-all duration-300 ${
            theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'
          }`}
        />
        <Moon
          size={17}
          className={`absolute transition-all duration-300 ${
            theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0'
          }`}
        />
      </span>
    </button>
  )
}
