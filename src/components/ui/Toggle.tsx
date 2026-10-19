import type { ReactNode } from 'react'

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  tone?: 'accent' | 'warn' | 'violet'
}

/**
 * Accessible switch. Uses a real checkbox so it works with keyboard navigation
 * and screen readers without any extra ARIA gymnastics.
 */
export function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  tone = 'accent',
}: ToggleProps) {
  const toneClass =
    tone === 'warn'
      ? 'peer-checked:bg-warn peer-checked:shadow-glow-warn'
      : tone === 'violet'
        ? 'peer-checked:bg-accent-2 peer-checked:shadow-accent-2/40'
        : 'peer-checked:bg-accent peer-checked:shadow-glow'

  return (
    <label
      htmlFor={id}
      className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-200 ${
        checked
          ? 'border-accent/45 bg-accent/8'
          : 'border-line/12 bg-raised/4 hover:border-line/25'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 items-center rounded-full border border-line/20 bg-canvas/70 p-0.5 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas ${toneClass}`}
        >
          <span
            className={`h-[1.125rem] w-[1.125rem] rounded-full bg-ink shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {icon}
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
