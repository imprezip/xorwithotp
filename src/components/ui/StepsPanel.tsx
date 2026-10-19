import type { ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

export interface StepData {
  id: number
  title: string
  caption: string
  blocks: {
    label?: string
    value: string
    tone?: 'default' | 'accent' | 'muted'
    wrap?: boolean
    note?: string
  }[]
  formula?: string[]
}

interface StepsPanelProps {
  steps: StepData[]
  /** Extra content rendered under the blocks of a given step. */
  renderExtra?: (step: StepData) => ReactNode
  emptyHint?: string
}

/**
 * "Show Steps" visualisation.
 *
 * It never changes the computation: the very same result object that fills the
 * output field is what is rendered here, step by step.
 */
export function StepsPanel({ steps, renderExtra, emptyHint }: StepsPanelProps) {
  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line/20 px-4 py-6 text-center text-xs text-faint">
        {emptyHint ?? 'Run an operation to see the step-by-step breakdown.'}
      </p>
    )
  }

  return (
    <ol className="space-y-3">
      {steps.map((step, stepIndex) => (
        <li
          key={step.id}
          className="animate-slide-up rounded-2xl border border-line/12 bg-canvas/30 p-4"
          style={{ animationDelay: `${Math.min(stepIndex * 45, 260)}ms` }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-[11px] font-bold text-accent">
              {step.id}
            </span>
            <div className="min-w-0 flex-1">
              <p className="label text-accent/90">Step {step.id}</p>
              <h4 className="mt-0.5 text-sm font-bold text-ink">{step.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted">{step.caption}</p>
            </div>
          </div>

          {step.blocks.length > 0 ? (
            <div className="mt-3 space-y-2">
              {step.blocks.map((block, blockIndex) => {
                if (block.label !== undefined && block.value === '') {
                  return (
                    <p key={`${block.label}-${blockIndex}`} className="label pt-1">
                      {block.label}
                    </p>
                  )
                }
                const isSubLabel = block.label === undefined
                return (
                  <div key={`${block.label ?? 'v'}-${blockIndex}`} className="min-w-0">
                    {block.label !== undefined ? (
                      <p
                        className={`label ${
                          block.tone === 'accent' ? 'text-accent' : ''
                        }`}
                      >
                        {block.label}
                      </p>
                    ) : null}
                    {isSubLabel || block.value !== '' ? (
                      <CodeBlock
                        tone={block.tone === 'accent' ? 'accent' : 'default'}
                        className={block.tone === 'muted' ? 'text-muted' : ''}
                        scroll={!block.wrap}
                      >
                        {block.value}
                      </CodeBlock>
                    ) : null}
                    {block.note ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-faint">{block.note}</p>
                    ) : null}
                  </div>
                )
              })}
              {renderExtra ? renderExtra(step) : null}
            </div>
          ) : (
            renderExtra?.(step)
          )}

          {step.formula && step.formula.length > 0 ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre rounded-xl border border-line/12 bg-raised/5 p-3.5 font-mono text-[12.5px] leading-relaxed text-accent-2/90">
              {step.formula.join('\n')}
            </pre>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
