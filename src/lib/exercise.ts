/**
 * Exercise engine.
 *
 * Test cases are plain data (see `src/data/*TestCases.ts`). When Exercise Mode
 * is switched on the application still runs the *same* cipher. Only the input
 * comes from a test case and the student has to type the result before the
 * expected output is revealed.
 */
import type { AnswerFormat } from './types'

export type ExerciseStatus = 'idle' | 'correct' | 'wrong'

export interface AnswerFieldSpec {
  key: string
  label: string
  hint?: string
  /** The representation the student is answering in. */
  format: AnswerFormat
  /**
   * When set, the panel renders a format picker for this field. The chosen
   * format is part of the question input, so the answer is always graded in
   * the representation the student picked.
   */
  options?: AnswerFormat[]
  /**
   * The correct answer. It is `undefined` in an *outline*, which is safe to keep
   * in state while the student types, and set only in the full question built
   * when "Check answer" is pressed.
   */
  expected?: string
  placeholder?: string
}

export interface ExerciseQuestion {
  id: number
  title: string
  subtitle: string
  /** Read-only values shown with the question, e.g. `Message 1: ATTACK AT DAWN`. */
  prompt: { label: string; value: string; note?: string }[]
  fields: AnswerFieldSpec[]
  /** Extra facts revealed only after the answers have been checked. */
  reveal: { label: string; value: string }[]
}

export type AnswerMap = Record<string, string>

export interface FieldCheck {
  key: string
  label: string
  submitted: string
  expected: string
  normalizedSubmitted: string
  normalizedExpected: string
  correct: boolean
  empty: boolean
}

export interface CheckResult {
  correct: boolean
  correctCount: number
  total: number
  fields: FieldCheck[]
  /** True when nothing (or nothing at all) was typed. */
  isEmpty: boolean
}

/**
 * Normalise a typed answer so that formatting differences (case, spaces,
 * `0x` prefixes, grouping) are not penalised, but content always is.
 */
export function normalizeAnswer(value: string, format: AnswerFormat): string {
  const trimmed = value.trim()
  if (format === 'text') {
    return trimmed.replace(/\s+/g, ' ').toLowerCase()
  }
  return trimmed.replace(/[\s_]+/g, '').replace(/^0[xX]/, '').toUpperCase()
}

/** Grade a set of answers against a question. */
export function checkAnswer(question: ExerciseQuestion, answers: AnswerMap): CheckResult {
  const fields: FieldCheck[] = question.fields.map((field) => {
    const submitted = (answers[field.key] ?? '').trim()
    const normalizedSubmitted = normalizeAnswer(submitted, field.format)
    const normalizedExpected = normalizeAnswer(field.expected ?? '', field.format)
    const empty = normalizedSubmitted.length === 0
    return {
      key: field.key,
      label: field.label,
      submitted,
      expected: field.expected ?? '',
      normalizedSubmitted,
      normalizedExpected,
      correct: !empty && normalizedSubmitted === normalizedExpected,
      empty,
    }
  })

  const correctCount = fields.filter((field) => field.correct).length
  return {
    correct: fields.length > 0 && correctCount === fields.length,
    correctCount,
    total: fields.length,
    fields,
    isEmpty: fields.every((field) => field.empty),
  }
}

export interface ExerciseFieldView {
  key: string
  label: string
  hint: string | null
  format: AnswerFormat
  /** Empty when the answer has a single fixed format. */
  options: AnswerFormat[]
  placeholder: string
  submitted: string
  /** `null` until the answer has been checked. This is what keeps it hidden. */
  expected: string | null
  correct: boolean | null
  empty: boolean
}

export interface ExerciseView {
  status: ExerciseStatus
  isCorrect: boolean
  correctCount: number
  total: number
  expectedVisible: boolean
  headline: string | null
  icon: string | null
  summary: string
  fields: ExerciseFieldView[]
  reveal: { label: string; value: string }[]
}

/**
 * Single source of truth for what the exercise panel renders.
 *
 * While `checked` is `null` the expected output is *not* part of the view at
 * all, so it can never leak into the DOM before the student has answered.
 */
export function buildExerciseView(
  question: ExerciseQuestion,
  answers: AnswerMap,
  checked: CheckResult | null,
): ExerciseView {
  const expectedVisible = checked !== null
  const byKey = new Map((checked?.fields ?? []).map((field) => [field.key, field]))

  const fields: ExerciseFieldView[] = question.fields.map((field) => {
    const check = byKey.get(field.key)
    return {
      key: field.key,
      label: field.label,
      hint: field.hint ?? null,
      format: field.format,
      options: field.options ?? [],
      placeholder: field.placeholder ?? '',
      submitted: answers[field.key] ?? '',
      expected: expectedVisible ? (field.expected ?? '') : null,
      correct: check ? check.correct : null,
      empty: check ? check.empty : false,
    }
  })

  const total = question.fields.length
  const correctCount = checked?.correctCount ?? 0
  const isCorrect = checked?.correct ?? false

  return {
    status: checked === null ? 'idle' : isCorrect ? 'correct' : 'wrong',
    isCorrect,
    correctCount,
    total,
    expectedVisible,
    headline: checked === null ? null : isCorrect ? 'Correct!' : 'Wrong!',
    icon: checked === null ? null : isCorrect ? '✓' : '✗',
    summary:
      checked === null
        ? `${total} ${total === 1 ? 'answer' : 'answers'} required`
        : isCorrect
          ? `All ${total} ${total === 1 ? 'answer' : 'answers'} correct`
          : `${correctCount} of ${total} correct`,
    fields,
    reveal: expectedVisible ? question.reveal : [],
  }
}
