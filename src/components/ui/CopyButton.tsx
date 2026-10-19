import { Check, Copy } from 'lucide-react'
import { useCopy } from '../../hooks/useCopy'

interface CopyButtonProps {
  value: string
  /** Identifies which button produced the "Copied!" state. */
  copyKey?: string
  label?: string
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/** Copy-to-clipboard button with inline feedback. */
export function CopyButton({
  value,
  copyKey,
  label = 'Copy',
  className = '',
  disabled = false,
  size = 'md',
}: CopyButtonProps) {
  const { copy, copiedKey } = useCopy()
  const key = copyKey ?? label
  const copied = copiedKey === key

  return (
    <button
      type="button"
      disabled={disabled || value.length === 0}
      onClick={() => void copy(value, key)}
      aria-label={copied ? `${label}: copied` : label}
      className={`btn btn-ghost shrink-0 ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : ''} ${className}`}
    >
      {copied ? (
        <>
          <Check size={size === 'sm' ? 13 : 15} aria-hidden="true" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy size={size === 'sm' ? 13 : 15} aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}
