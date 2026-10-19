import { useId, type ReactNode } from 'react'

interface TermProps {
  children: ReactNode
  /** Tooltip text: a short, plain-language definition. */
  definition: string
}

/**
 * Inline glossary term with an accessible tooltip.
 *
 * Implemented with CSS only (`group-hover` / `group-focus-within`) so there is
 * no modal, no portal and no JS positioning to go wrong. The trigger is a
 * button, so it is reachable with the keyboard.
 */
export function Term({ children, definition }: TermProps) {
  const id = useId()
  return (
    <span className="group/term relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        className="cursor-help border-b border-dotted border-accent/60 text-inherit font-semibold text-accent transition-colors hover:border-accent"
      >
        {children}
        <span className="sr-only">, definition</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-60 -translate-x-1/2 rounded-lg border border-line/20 bg-canvas/95 p-2.5 text-[11.5px] font-normal normal-case leading-relaxed tracking-normal text-muted opacity-0 shadow-xl backdrop-blur transition-all duration-200 group-hover/term:opacity-100 group-focus-within/term:opacity-100 sm:w-64"
      >
        {definition}
      </span>
    </span>
  )
}
