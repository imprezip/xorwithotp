import type { ReactNode } from 'react'

interface SectionHeaderProps {
  index: string
  eyebrow: string
  title: string
  description?: ReactNode
  icon?: ReactNode
  id?: string
}

/** Numbered section header used for "1. XOR Cipher", "2. Security", "3. OTP". */
export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  icon,
  id,
}: SectionHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-start sm:gap-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="font-mono text-xs tracking-[0.3em] text-faint">{index}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="label text-accent/90">{eyebrow}</p>
        <h2 id={id} className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <div className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">{description}</div>
        ) : null}
      </div>
    </div>
  )
}
