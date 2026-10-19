import type { ReactNode } from 'react'

interface CodeBlockProps {
  children: ReactNode
  /** Long binary/hex output scrolls horizontally instead of wrapping. */
  scroll?: boolean
  tone?: 'default' | 'accent' | 'muted' | 'danger'
  className?: string
  'aria-label'?: string
}

/** Monospace block for bytes, binary dumps and formulas. */
export function CodeBlock({
  children,
  scroll = true,
  tone = 'default',
  className = '',
  ...rest
}: CodeBlockProps) {
  const toneClass =
    tone === 'accent'
      ? 'border-accent/35 bg-accent/8 text-accent'
      : tone === 'muted'
        ? 'text-muted'
        : tone === 'danger'
          ? 'border-danger/35 bg-danger/8 text-danger'
          : ''

  return (
    <pre
      className={`code-block ${scroll ? 'overflow-x-auto' : 'whitespace-pre-wrap break-words'} ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </pre>
  )
}
