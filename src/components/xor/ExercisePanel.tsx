import type { ReactNode } from 'react'
import { CheckCheck, ChevronLeft, ChevronRight, FlaskConical, RotateCcw } from 'lucide-react'
import { Alert } from '../ui/Alert'
import { CopyButton } from '../ui/CopyButton'
import type { AnswerMap, CheckResult, ExerciseQuestion } from '../../lib/exercise'
import { buildExerciseView } from '../../lib/exercise'
import type { AnswerFormat } from '../../lib/types'

const ANSWER_FORMAT_LABEL: Record<AnswerFormat, string> = {
  text: 'Text (UTF-8)',
  hex: 'Hexadecimal',
  binary: 'Binary',
  base64: 'Base64',
}

interface ExercisePanelProps {
  question: ExerciseQuestion
  answers: AnswerMap
  checked: CheckResult | null
  onAnswerChange: (key: string, value: string) => void
  /** Called when the student picks another representation for a field. */
  onAnswerFormatChange?: (key: string, format: AnswerFormat) => void
  onCheck: () => void
  onReset: () => void
  /** Optional navigation between the worked examples that can be loaded. */
  onStep?: (direction: 1 | -1) => void
  index?: number
  total?: number
  /** Rendered under the header, e.g. the one-click example loader. */
  tools?: ReactNode
  eyebrow?: string
  heading?: string
}

/**
 * Exercise Mode answer panel.
 *
 * The cipher is untouched: whatever is in the form is what gets graded. The
 * expected output is part of the view model only after `Check answer` has been
 * pressed. See `buildExerciseView`.
 */
export function ExercisePanel({
  question,
  answers,
  checked,
  onAnswerChange,
  onAnswerFormatChange,
  onCheck,
  onReset,
  onStep,
  index = 0,
  total = 1,
  tools,
  eyebrow = 'Exercise Mode',
  heading,
}: ExercisePanelProps) {
  const view = buildExerciseView(question, answers, checked)
  const canStep = onStep !== undefined

  return (
    <div className="animate-slide-up rounded-2xl border border-accent/25 bg-accent/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/35 bg-accent/12 text-accent">
            <FlaskConical size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">
              {heading ?? (canStep ? `Test Case ${index + 1} / ${total}` : 'Input your answer')}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-faint">{eyebrow}</p>
          </div>
        </div>
        {canStep ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => onStep?.(-1)}
              disabled={index === 0}
              aria-label="Previous example"
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => onStep?.(1)}
              disabled={index >= total - 1}
              aria-label="Next example"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {tools ? <div className="mt-3.5">{tools}</div> : null}

      <div className="mt-4 rounded-xl border border-line/12 bg-canvas/35 p-3.5">
        <p className="text-sm font-semibold text-ink">{question.subtitle}</p>
        <dl className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {question.prompt.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-line/10 bg-raised/5 px-3 py-2"
            >
              <dt className="label flex items-center justify-between gap-2">
                <span>{item.label}</span>
                {item.note ? (
                  <span className="font-normal normal-case tracking-normal text-faint/80">
                    {item.note}
                  </span>
                ) : null}
              </dt>
              <dd className="mt-1 break-all font-mono text-[12.5px] text-ink/90">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <form
        className="mt-4 space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          onCheck()
        }}
      >
        {view.fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`answer-${field.key}`} className="label">
                {field.label}
              </label>
              {field.options.length === 0 ? (
                <span className="text-[10.5px] uppercase tracking-wider text-faint">
                  {ANSWER_FORMAT_LABEL[field.format]}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <input
                id={`answer-${field.key}`}
                type="text"
                className={`field min-w-0 flex-1 ${
                  field.correct === true
                    ? 'border-ok/60'
                    : field.correct === false
                      ? 'field-error'
                      : ''
                }`}
                value={field.submitted}
                spellCheck={false}
                autoComplete="off"
                placeholder={field.placeholder}
                aria-describedby={field.hint ? `hint-${field.key}` : undefined}
                onChange={(event) => onAnswerChange(field.key, event.target.value)}
              />
              {field.options.length > 0 ? (
                <select
                  id={`format-${field.key}`}
                  aria-label={`${field.label} format`}
                  value={field.format}
                  onChange={(event) =>
                    onAnswerFormatChange?.(field.key, event.target.value as AnswerFormat)
                  }
                  className="field w-36 shrink-0 cursor-pointer appearance-none bg-[length:0.7rem] bg-[right_0.7rem_center] bg-no-repeat pr-7"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%238b9ab4' stroke-width='1.6'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
                  }}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {ANSWER_FORMAT_LABEL[option]}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {field.hint ? (
              <p id={`hint-${field.key}`} className="text-[11px] leading-relaxed text-faint">
                {field.hint}
              </p>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" className="btn btn-primary">
            <CheckCheck size={16} aria-hidden="true" />
            Check Answer
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </div>
      </form>

      {/* Result: icon + text + colour, never colour alone. */}
      <div className="mt-4" aria-live="polite">
        {view.status === 'idle' ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line/20 px-3.5 py-3">
            <p className="text-xs text-faint">
              Expected output: <span className="font-semibold text-muted">hidden</span>
            </p>
            <span className="text-[11px] text-faint">{view.summary}</span>
          </div>
        ) : (
          <Alert
            tone={view.isCorrect ? 'ok' : 'danger'}
            title={`${view.icon} ${view.headline}`}
          >
            <p>{view.summary}</p>
            {!view.isCorrect ? (
              <ul className="mt-1 space-y-1">
                {view.fields.map((field) => (
                  <li key={field.key} className="font-mono text-[11.5px]">
                    {field.correct ? '✓' : '✗'} {field.label}:{' '}
                    <span className="text-ink/80">
                      {field.submitted.trim() || '(empty)'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        )}
      </div>

      {view.expectedVisible ? (
        <div className="mt-3 animate-pop-in space-y-3">
          <div className="rounded-xl border border-ok/30 bg-ok/8 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="label text-ok">Expected Output</p>
              <CopyButton
                value={view.fields.map((field) => field.expected ?? '').join('\n')}
                copyKey="exercise-expected"
                label="Copy answers"
                size="sm"
              />
            </div>
            <ul className="space-y-1.5">
              {view.fields.map((field) => (
                <li key={field.key} className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wider text-faint">
                    {field.label}
                  </span>
                  <code className="block overflow-x-auto whitespace-pre break-all font-mono text-[12.5px] text-ink">
                    {field.expected}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          {view.reveal.length > 0 ? (
            <details className="group rounded-xl border border-line/12 bg-canvas/30">
              <summary className="cursor-pointer list-none px-3.5 py-2.5 text-xs font-semibold text-muted transition-colors hover:text-ink">
                <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">
                  ›
                </span>
                Show the full working
              </summary>
              <dl className="space-y-2.5 border-t border-line/10 px-3.5 py-3">
                {view.reveal.map((item) => (
                  <div key={item.label}>
                    <dt className="label">{item.label}</dt>
                    <dd className="mt-0.5 overflow-x-auto whitespace-pre font-mono text-[12px] text-ink/85">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
