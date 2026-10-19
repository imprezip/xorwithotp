import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  FlaskConical,
  KeyRound,
  Lock,
  Repeat,
  Scissors,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { toMessage } from '../../lib/errors'
import { parseToBytes } from '../../lib/parse'
import { buildXorSteps, operationLabels, runXor, type XorRunResult } from '../../lib/pipeline'
import { applyKey, describeKeyUsage } from '../../lib/xor'
import { generateRandomKey, OtpKeyVault, type OtpKeyRecord } from '../../lib/otp'
import { buildXorOutline, buildXorQuestion, defaultAnswerFormat } from '../../lib/questions'
import { checkAnswer, type AnswerMap, type CheckResult, type ExerciseQuestion } from '../../lib/exercise'
import { xorTestCasesFor, type XorTestCase } from '../../data/xorTestCases'
import type { AnswerFormat, CipherOutputFormat, InputFormat, Operation } from '../../lib/types'
import { Alert } from '../ui/Alert'
import { ByteTable } from '../ui/ByteTable'
import { CodeBlock } from '../ui/CodeBlock'
import { FormatSelect } from '../ui/FormatSelect'
import { SectionHeader } from '../ui/SectionHeader'
import { Segmented } from '../ui/Segmented'
import { StepsPanel } from '../ui/StepsPanel'
import { TextField } from '../ui/TextField'
import { Toggle } from '../ui/Toggle'
import { ExercisePanel } from './ExercisePanel'
import { OtpKeyPanel } from './OtpKeyPanel'
import { XorOutput } from './XorOutput'

const INPUT_FORMATS: { value: InputFormat; label: string }[] = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hexadecimal' },
  { value: 'binary', label: 'Binary' },
]

const OUTPUT_FORMATS: { value: CipherOutputFormat; label: string }[] = [
  { value: 'hex', label: 'Hexadecimal' },
  { value: 'binary', label: 'Binary' },
  { value: 'base64', label: 'Base64' },
]

const EXAMPLE: Record<Operation, { input: string; inputFormat: InputFormat }> = {
  encrypt: { input: 'HELLO', inputFormat: 'text' },
  decrypt: { input: '09070F080A', inputFormat: 'hex' },
}

const EXAMPLE_KEY = 'ABCDE'

export function XorCipherSection() {
  /* ---- core state ------------------------------------------------------- */
  const [operation, setOperation] = useState<Operation>('encrypt')
  const [input, setInput] = useState(EXAMPLE.encrypt.input)
  const [inputFormat, setInputFormat] = useState<InputFormat>(EXAMPLE.encrypt.inputFormat)
  const [key, setKey] = useState(EXAMPLE_KEY)
  const [keyFormat, setKeyFormat] = useState<InputFormat>('text')
  const [outputFormat, setOutputFormat] = useState<CipherOutputFormat>('hex')

  /* ---- three toggles ---------------------------------------------------- */
  const [otpMode, setOtpMode] = useState(false)
  const [exerciseMode, setExerciseMode] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  /* ---- result ----------------------------------------------------------- */
  const [result, setResult] = useState<XorRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* ---- OTP key management ----------------------------------------------- */
  const vaultRef = useRef<OtpKeyVault | null>(null)
  if (vaultRef.current === null) vaultRef.current = new OtpKeyVault()
  const [otpRecord, setOtpRecord] = useState<OtpKeyRecord | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  /** False once the OTP countdown ended, which masks every other key view. */
  const [otpRevealed, setOtpRevealed] = useState(false)
  const handleRevealChange = useCallback((revealed: boolean) => setOtpRevealed(revealed), [])

  /* ---- exercise --------------------------------------------------------- */
  const examples = useMemo(() => xorTestCasesFor(operation), [operation])
  const [exampleIndex, setExampleIndex] = useState(0)
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat>(() =>
    defaultAnswerFormat(operation),
  )
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [checked, setChecked] = useState<CheckResult | null>(null)
  const [checkedQuestion, setCheckedQuestion] = useState<ExerciseQuestion | null>(null)

  const labels = operationLabels(operation)

  /* ---- derived values --------------------------------------------------- */
  const messageLength = useMemo(() => {
    try {
      return parseToBytes(input, inputFormat, operation === 'encrypt' ? 'plaintext' : 'ciphertext')
        .length
    } catch {
      return 0
    }
  }, [input, inputFormat, operation])

  /** How the key will be fitted to the message. Shown before running. */
  const keyPlan = useMemo(() => {
    if (otpMode) return null
    try {
      const keyBytes = parseToBytes(key, keyFormat, 'key')
      if (messageLength === 0) return null
      return applyKey(keyBytes, messageLength)
    } catch {
      return null
    }
  }, [otpMode, key, keyFormat, messageLength])

  const liveError = useMemo(() => {
    if (exerciseMode) return null
    if (otpMode) {
      if (!otpRecord) return 'Generate a random OTP key first.'
      if (messageLength === 0) return 'Enter a message first. The key length must match it.'
      if (otpRecord.length !== messageLength)
        return `Key length must match the input length in bytes (${otpRecord.length} vs ${messageLength}).`
      // Decrypting with the key that encrypted this very ciphertext is not a
      // not a reuse. Only encrypting a second message with it would be.
      if (operation === 'encrypt' && otpRecord.usedAt)
        return 'This OTP key has already been used. OTP keys must never be reused.'
      return null
    }
    try {
      const role = operation === 'encrypt' ? 'plaintext' : 'ciphertext'
      parseToBytes(input, inputFormat, role)
      parseToBytes(key, keyFormat, 'key')
      return null
    } catch (parseError) {
      return toMessage(parseError, 'Invalid input.')
    }
  }, [
    exerciseMode,
    otpMode,
    otpRecord,
    messageLength,
    input,
    inputFormat,
    key,
    keyFormat,
    operation,
  ])

  // Once the OTP countdown has ended the key must not reappear anywhere else.
  const redactKey = otpMode && otpRecord !== null && !otpRevealed
  const stepsVisible = showSteps && (!exerciseMode || checked !== null)
  const steps = useMemo(
    () => (result ? buildXorSteps(result, { redactKey }) : []),
    [result, redactKey],
  )

  const effectiveKeyText = otpMode ? (otpRecord?.hex ?? '') : key
  const effectiveKeyFormat: InputFormat = otpMode ? 'hex' : keyFormat

  // In OTP mode the graded key is the generated one, not what is typed in the key field.
  const questionInput = useMemo(
    () => ({
      operation,
      input,
      inputFormat,
      key: effectiveKeyText,
      keyFormat: effectiveKeyFormat,
      outputFormat,
      answerFormat,
      redactKey,
    }),
    [
      operation,
      input,
      inputFormat,
      effectiveKeyText,
      effectiveKeyFormat,
      outputFormat,
      answerFormat,
      redactKey,
    ],
  )
  /** Structure only, so this is safe to keep in state. */
  const outline = useMemo(() => buildXorOutline(questionInput), [questionInput])
  const question = checkedQuestion ?? outline

  /* ---- actions ---------------------------------------------------------- */
  const run = useCallback(() => {
    setError(null)
    if (otpMode) setOtpError(null)

    const vault = vaultRef.current

    if (otpMode) {
      if (!otpRecord) {
        setOtpError('Generate a random OTP key first.')
        return
      }
      try {
        if (operation === 'encrypt') vault?.assertUnused(otpRecord.hex)
      } catch (reuseError) {
        setOtpError(toMessage(reuseError, 'This OTP key cannot be reused.'))
        return
      }
    }

    setBusy(true)
    try {
      const next = runXor({
        operation,
        input,
        inputFormat,
        key: effectiveKeyText,
        keyFormat: effectiveKeyFormat,
        outputFormat,
      })
      setResult(next)

      // A One-Time Pad key may be used exactly once.
      if (otpMode && otpRecord && operation === 'encrypt' && vault) {
        vault.markUsed(otpRecord.hex)
        setOtpRecord({ ...otpRecord, usedAt: Date.now() })
      }
    } catch (runError) {
      setResult(null)
      setError(toMessage(runError, 'The operation failed.'))
    } finally {
      setBusy(false)
    }
  }, [
    otpMode,
    otpRecord,
    operation,
    input,
    inputFormat,
    effectiveKeyText,
    effectiveKeyFormat,
    outputFormat,
  ])

  const checkExercise = useCallback(() => {
    setError(null)
    try {
      // The full question, expected values included, exists only from here on.
      const full = buildXorQuestion(questionInput)
      setCheckedQuestion(full)
      setChecked(checkAnswer(full, answers))
    } catch (buildError) {
      setChecked(null)
      setCheckedQuestion(null)
      setError(toMessage(buildError, 'Fix the input before checking your answer.'))
    }
  }, [questionInput, answers])

  const generateKey = useCallback(() => {
    const vault = vaultRef.current
    setOtpError(null)
    if (messageLength === 0 || !vault) return
    try {
      const record = vault.issue(generateRandomKey(messageLength))
      setOtpRecord(record)
      setOtpRevealed(false)
    } catch (issueError) {
      setOtpError(toMessage(issueError, 'Could not generate a key.'))
    }
  }, [messageLength])

  const clearKey = useCallback(() => {
    setOtpRecord(null)
    setOtpError(null)
    setOtpRevealed(false)
  }, [])

  const changeOperation = useCallback((next: Operation) => {
    setOperation(next)
    setAnswerFormat(defaultAnswerFormat(next))
    setInput(EXAMPLE[next].input)
    setInputFormat(EXAMPLE[next].inputFormat)
    setKey(EXAMPLE_KEY)
    setKeyFormat('text')
    setResult(null)
    setError(null)
    setExampleIndex(0)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [])

  const loadExample = useCallback((testCase: XorTestCase, position: number) => {
    setExampleIndex(position)
    setOperation(testCase.operation)
    setAnswerFormat(defaultAnswerFormat(testCase.operation))
    setInput(testCase.input)
    setInputFormat(testCase.inputFormat)
    setKey(testCase.key)
    setKeyFormat(testCase.keyFormat)
    setOutputFormat(
      testCase.outputFormat === 'text' ? 'hex' : (testCase.outputFormat as CipherOutputFormat),
    )
    setResult(null)
    setError(null)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [])

  const stepExample = useCallback(
    (direction: 1 | -1) => {
      const next = Math.min(Math.max(exampleIndex + direction, 0), examples.length - 1)
      const testCase = examples[next]
      if (testCase) loadExample(testCase, next)
    },
    [exampleIndex, examples, loadExample],
  )

  const changeAnswerFormat = useCallback((next: AnswerFormat) => {
    setAnswerFormat(next)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [])

  const changeExerciseMode = useCallback((enabled: boolean) => {
    setExerciseMode(enabled)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
    setError(null)
  }, [])

  const resetAll = useCallback(() => {
    setInput(EXAMPLE[operation].input)
    setInputFormat(EXAMPLE[operation].inputFormat)
    setKey(EXAMPLE_KEY)
    setKeyFormat('text')
    setOutputFormat('hex')
    setResult(null)
    setError(null)
    setOtpError(null)
    setOtpRecord(null)
    setOtpRevealed(false)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [operation])

  // Changing the message invalidates the OTP key: its length is defined by the
  // previous message, so it is dropped instead of being silently reused.
  const previousLength = useRef(messageLength)
  useEffect(() => {
    if (otpMode && otpRecord && previousLength.current !== messageLength) {
      clearKey()
    }
    previousLength.current = messageLength
  }, [messageLength, otpMode, otpRecord, clearKey])

  // Any edit to the cipher inputs invalidates a previous check.
  const invalidateCheck = useCallback(() => {
    setChecked(null)
    setCheckedQuestion(null)
  }, [])
  const changeInput = useCallback(
    (value: string) => {
      setInput(value)
      invalidateCheck()
    },
    [invalidateCheck],
  )
  const changeKey = useCallback(
    (value: string) => {
      setKey(value)
      invalidateCheck()
    },
    [invalidateCheck],
  )
  const changeKeyFormat = useCallback(
    (value: InputFormat) => {
      setKeyFormat(value)
      invalidateCheck()
    },
    [invalidateCheck],
  )
  const changeOutputFormat = useCallback(
    (value: CipherOutputFormat) => {
      setOutputFormat(value)
      invalidateCheck()
    },
    [invalidateCheck],
  )

  return (
    <section id="xor-cipher" className="scroll-mt-24 py-14 sm:py-20">
      <SectionHeader
        index="01"
        eyebrow="The core primitive"
        icon={<Lock size={20} aria-hidden="true" />}
        title="XOR Cipher"
        description={
          <p>
            One operation: <code className="font-mono text-accent">C = M XOR K</code> and{' '}
            <code className="font-mono text-accent">M = C XOR K</code>. The toggles never change the
            algorithm.
          </p>
        }
      />

      <div className="glass card-hover rounded-3xl p-4 sm:p-6 lg:p-7">
        {/* ---------- operation ---------- */}
        <div
          className="flex flex-col gap-3 border-b border-line/10 pb-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="label">Operation</p>
          <Segmented<Operation>
            label="XOR operation"
            value={operation}
            onChange={changeOperation}
            options={[
              { value: 'encrypt', label: 'Encrypt', hint: 'plaintext in, ciphertext out' },
              { value: 'decrypt', label: 'Decrypt', hint: 'ciphertext in, plaintext out' },
            ]}
          />
        </div>

        {/* ---------- the form: identical in every mode ---------- */}
        <div className="grid gap-5 pt-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <FormatSelect<InputFormat>
              id="xor-input-format"
              label="Input format"
              value={inputFormat}
              options={INPUT_FORMATS}
              onChange={setInputFormat}
            />
            <TextField
              label={labels.input}
              value={input}
              onChange={changeInput}
              placeholder={operation === 'encrypt' ? 'Type any text…' : '09070F080A'}
              meta={messageLength > 0 ? `${messageLength} bytes` : ''}
              hint={
                inputFormat === 'text'
                  ? 'UTF-8, so é is two bytes.'
                  : inputFormat === 'hex'
                    ? 'Two digits per byte.'
                    : 'Eight bits per byte.'
              }
            />
          </div>

          <div className="flex flex-col gap-3.5">
            {otpMode ? (
              <OtpKeyPanel
                messageLength={messageLength}
                record={otpRecord}
                onGenerate={generateKey}
                onRevealChange={handleRevealChange}
                busy={busy}
                error={otpError}
              />
            ) : (
              <>
                <FormatSelect<InputFormat>
                  id="xor-key-format"
                  label="Key format"
                  value={keyFormat}
                  options={INPUT_FORMATS}
                  onChange={changeKeyFormat}
                />
                <TextField
                  label="Key"
                  value={key}
                  onChange={changeKey}
                  placeholder="Any length"
                  hint="Short keys repeat, long keys are trimmed."
                />
                <KeyPlanNote plan={keyPlan} />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Toggles
            otpMode={otpMode}
            exerciseMode={exerciseMode}
            showSteps={showSteps}
            onOtp={setOtpMode}
            onExercise={changeExerciseMode}
            onSteps={setShowSteps}
          />
          <div className="sm:col-span-2 sm:flex sm:items-end sm:justify-end">
            {exerciseMode ? (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
                <div className="w-full sm:w-48">
                  <FormatSelect<CipherOutputFormat>
                    id="xor-output-format"
                    label="Answer format"
                    value={outputFormat}
                    options={OUTPUT_FORMATS}
                    onChange={changeOutputFormat}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={checkExercise}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Check Answer
                </button>
                <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={resetAll}>
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
                <div className="w-full sm:w-48">
                  <FormatSelect<CipherOutputFormat>
                    id="xor-output-format"
                    label="Output format"
                    value={outputFormat}
                    options={OUTPUT_FORMATS}
                    onChange={changeOutputFormat}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={run}
                  disabled={busy || liveError !== null}
                  title={liveError ?? undefined}
                >
                  {busy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
                  {operation === 'encrypt' ? 'Encrypt' : 'Decrypt'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-full sm:w-auto"
                  onClick={resetAll}
                  disabled={busy}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {liveError ? (
          <p className="mt-3 flex items-start gap-2 text-xs text-warn">
            <span aria-hidden="true">⚠</span>
            <span>{liveError}</span>
          </p>
        ) : null}

        {error ? (
          <div className="mt-4">
            <Alert tone="danger" title="✗ Error" role="alert">
              <p>{error}</p>
            </Alert>
          </div>
        ) : null}

        {/* ---------- exercise: the same cipher, now with answer fields ---------- */}
        {exerciseMode ? (
          <div className="mt-5">
            <ExercisePanel
              question={question}
              answers={answers}
              checked={checked}
              onAnswerChange={(fieldKey, value) => {
                setAnswers((current) => ({ ...current, [fieldKey]: value }))
                if (checked) setChecked(null)
              }}
              onAnswerFormatChange={(_fieldKey, next) => changeAnswerFormat(next)}
              onCheck={checkExercise}
              onReset={() => {
                setAnswers({})
                setChecked(null)
                setCheckedQuestion(null)
              }}
              onStep={stepExample}
              index={Math.min(exampleIndex, examples.length - 1)}
              total={examples.length}
              heading={`Input your answer (${examples.length} worked examples available)`}
              eyebrow="Exercise Mode"
              tools={<ExampleLoader examples={examples} index={exampleIndex} onLoad={loadExample} />}
            />
            {showSteps && !checked ? (
              <p className="mt-3 rounded-xl border border-dashed border-line/20 px-4 py-3 text-center text-xs text-faint">
                Steps unlock after you check.
              </p>
            ) : null}
          </div>
        ) : result ? (
          <div className="mt-5 space-y-4">
            <XorOutput result={result} />
            {stepsVisible ? (
              <StepsPanel
                steps={steps}
                renderExtra={(step) =>
                  step.id === 4 ? (
                    <ByteTable
                      rows={result.rows}
                      caption="Per-byte XOR, set bits highlighted"
                      redactKey={redactKey}
                    />
                  ) : null
                }
              />
            ) : (
              <CompactFlow result={result} redactKey={redactKey} />
            )}
          </div>
        ) : null}

        {showSteps && !result && !exerciseMode ? (
          <p className="mt-4 rounded-xl border border-dashed border-line/20 px-4 py-5 text-center text-xs text-faint">
            Run {operation === 'encrypt' ? 'Encrypt' : 'Decrypt'} with{' '}
            <span className="font-semibold text-muted">Show Steps</span> on.
          </p>
        ) : null}
      </div>

    </section>
  )
}

/* -------------------------------------------------------------------------- */

function Toggles({
  otpMode,
  exerciseMode,
  showSteps,
  onOtp,
  onExercise,
  onSteps,
}: {
  otpMode: boolean
  exerciseMode: boolean
  showSteps: boolean
  onOtp: (value: boolean) => void
  onExercise: (value: boolean) => void
  onSteps: (value: boolean) => void
}) {
  return (
    <>
      <Toggle
        id="xor-otp-mode"
        checked={otpMode}
        onChange={onOtp}
        tone="violet"
        label="OTP Mode"
        icon={<ShieldCheck size={15} aria-hidden="true" />}
        description="Generate a random one-time pad key instead of typing one."
      />
      <Toggle
        id="xor-exercise-mode"
        checked={exerciseMode}
        onChange={onExercise}
        label="Exercise Mode"
        icon={<FlaskConical size={15} aria-hidden="true" />}
        description="Same cipher, but you type the result and grade yourself."
      />
      <Toggle
        id="xor-show-steps"
        checked={showSteps}
        onChange={onSteps}
        label="Show Steps"
        icon={<BookOpen size={15} aria-hidden="true" />}
        description="Reveal bytes, binary and the per-byte XOR table."
      />
    </>
  )
}

/** One-click starting points. Optional: any input of your own can be exercised. */
function ExampleLoader({
  examples,
  index,
  onLoad,
}: {
  examples: XorTestCase[]
  index: number
  onLoad: (testCase: XorTestCase, position: number) => void
}) {
  return (
    <div className="rounded-xl border border-line/12 bg-canvas/30 p-3">
      <p className="label">Worked examples (optional)</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((testCase, position) => (
          <button
            key={testCase.id}
            type="button"
            onClick={() => onLoad(testCase, position)}
            aria-pressed={position === index}
            className={`btn btn-quiet px-2.5 py-1.5 text-[11.5px] ${
              position === index ? 'border-accent/45 text-accent' : ''
            }`}
            title={testCase.subtitle}
          >
            {testCase.title}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Tells the user, before running anything, what will happen to the key. */
function KeyPlanNote({ plan }: { plan: ReturnType<typeof applyKey> | null }) {
  if (!plan) return null
  if (plan.usage.mode === 'exact') {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-line/12 bg-canvas/30 px-3.5 py-2.5 text-[11.5px] text-muted">
        <KeyRound size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <span>
          Exact fit: <span className="font-mono text-ink/85">{plan.usage.keyLength} bytes</span>.
        </span>
      </p>
    )
  }
  return (
    <p className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3.5 py-2.5 text-[11.5px] text-accent">
      {plan.usage.mode === 'repeated' ? (
        <Repeat size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <Scissors size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span>{describeKeyUsage(plan.usage)}</span>
    </p>
  )
}

/** Short result summary shown when Show Steps is off. */
function CompactFlow({ result, redactKey }: { result: XorRunResult; redactKey: boolean }) {
  return (
    <div className="rounded-2xl border border-line/12 bg-canvas/25 p-4">
      <p className="label">Summary</p>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <CodeBlock>
          {`${result.inputLabel}: ${result.inputRaw}\nKey:      ${redactKey ? '••••••••••' : result.keyRaw}`}
        </CodeBlock>
        <CodeBlock tone="accent">{`↓ XOR ↓\n${result.outputLabel}: ${result.outputText}`}</CodeBlock>
      </div>
      {result.keyUsage.mode !== 'exact' ? (
        <p className="mt-2 text-[11px] text-faint">{describeKeyUsage(result.keyUsage)}</p>
      ) : null}
    </div>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas"
    />
  )
}
