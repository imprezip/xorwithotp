interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  label: string
  size?: 'sm' | 'md'
  tone?: 'accent' | 'warn'
}

/** Two-state control used for Encrypt / Decrypt. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  tone = 'accent',
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex w-full gap-1 rounded-xl border border-line/12 bg-canvas/40 p-1 sm:w-auto"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 whitespace-nowrap rounded-lg font-semibold transition-all duration-200 sm:flex-none ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm'
            } ${
              active
                ? tone === 'warn'
                  ? 'bg-warn/90 text-canvas shadow-glow-warn'
                  : 'bg-accent/90 text-canvas shadow-glow'
                : 'text-muted hover:bg-raised/8 hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
