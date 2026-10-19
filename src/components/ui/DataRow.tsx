import type { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

interface DataRowProps {
  label: ReactNode
  value: ReactNode
  /** Raw text handed to the copy button. */
  copyValue?: string
  copyLabel?: string
  note?: ReactNode
  tone?: 'default' | 'accent' | 'ok' | 'warn' | 'danger'
  mono?: boolean
}

/** A single labelled value with an optional copy action. */
export function DataRow({
  label,
  value,
  copyValue,
  copyLabel,
  note,
  tone = 'default',
  mono = true,
}: DataRowProps) {
  const valueTone =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'ok'
        ? 'text-ok'
        : tone === 'warn'
          ? 'text-warn'
          : tone === 'danger'
            ? 'text-danger'
            : 'text-ink'

  return (
    <div className="flex flex-col gap-1.5 border-b border-line/8 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:w-44">
        <span className="label">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div
          className={`min-w-0 break-words text-sm leading-relaxed ${
            mono ? 'font-mono' : 'font-sans'
          } ${valueTone}`}
        >
          {value}
        </div>
        {note ? <p className="text-[11.5px] leading-relaxed text-faint">{note}</p> : null}
      </div>
      {copyValue !== undefined ? (
        <div className="shrink-0 sm:self-start">
          <CopyButton value={copyValue} copyKey={copyLabel ?? String(label)} label="Copy" size="sm" />
        </div>
      ) : null}
    </div>
  )
}
