import { useId, type ReactNode } from 'react'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
  hint?: ReactNode
  disabled?: boolean
  readOnly?: boolean
  monospace?: boolean
  rows?: number
  /** Extra information shown on the right of the label, e.g. a byte counter. */
  meta?: ReactNode
  autoComplete?: string
}

/** Labelled input with inline validation messaging. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  disabled = false,
  readOnly = false,
  monospace = true,
  rows,
  meta,
  autoComplete = 'off',
}: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  const shared = {
    id,
    value,
    disabled,
    readOnly,
    placeholder,
    autoComplete,
    spellCheck: false as const,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {meta ? <span className="font-mono text-[11px] text-faint">{meta}</span> : null}
      </div>

      {rows ? (
        <textarea
          {...shared}
          rows={rows}
          className={`field resize-y leading-relaxed ${error ? 'field-error' : ''} ${
            monospace ? '' : 'font-sans'
          }`}
        />
      ) : (
        <input
          {...shared}
          type="text"
          spellCheck={false}
          className={`field ${error ? 'field-error' : ''} ${monospace ? '' : 'font-sans'}`}
        />
      )}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <span aria-hidden="true">✗</span>
          <span>{error}</span>
        </p>
      ) : null}

      {hint ? (
        <p id={hintId} className="text-[11px] leading-relaxed text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
