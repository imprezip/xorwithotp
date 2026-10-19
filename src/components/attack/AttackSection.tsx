import { useCallback, useMemo, useState } from 'react'
import {
  BookOpen,
  FlaskConical,
  Repeat,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
} from 'lucide-react'
import { toMessage } from '../../lib/errors'
import { bytesToHex, bytesToHexSpaced } from '../../lib/bytes'
import { parseToBytes } from '../../lib/parse'
import {
  buildAttackSteps,
  runKeyReuseAttack,
  runKeyReuseDecrypt,
  type AttackDecryptResult,
  type AttackEncryptResult,
} from '../../lib/attack'
import { applyKey, describeKeyUsage } from '../../lib/xor'
import { generateRandomKey, type OtpKeyRecord } from '../../lib/otp'
import { buildAttackOutline, buildAttackQuestion } from '../../lib/questions'
import {
  checkAnswer,
  type AnswerMap,
  type CheckResult,
  type ExerciseQuestion,
} from '../../lib/exercise'
import { attackTestCasesFor, type AttackTestCase } from '../../data/attackTestCases'
import type { InputFormat, Operation } from '../../lib/types'
import { Alert } from '../ui/Alert'
import { CodeBlock } from '../ui/CodeBlock'
import { DataRow } from '../ui/DataRow'
import { FormatSelect } from '../ui/FormatSelect'
import { SectionHeader } from '../ui/SectionHeader'
import { Segmented } from '../ui/Segmented'
import { StepsPanel } from '../ui/StepsPanel'
import { TextField } from '../ui/TextField'
import { Toggle } from '../ui/Toggle'
import { ExercisePanel } from '../xor/ExercisePanel'
import { OtpKeyPanel } from '../xor/OtpKeyPanel'
import { AttackTable } from './AttackTable'
import { KnownPlaintextCard } from './KnownPlaintextCard'

type AttackResult = AttackEncryptResult | AttackDecryptResult

const EXAMPLE = {
  encrypt: { message1: 'ATTACK AT DAWN', message2: 'DEFEND WALLS!!' },
  decrypt: {
    ciphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
    ciphertext2: '1E2A36C4DCE7949297ABB45A8093',
  },
}

const KEY_FORMATS: { value: InputFormat; label: string }[] = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hexadecimal' },
  { value: 'binary', label: 'Binary' },
]

const EXAMPLE_KEY = 'NIGHTFALL'

const NOT_TEXT_NOTE = 'These bytes are not valid UTF-8, so they are shown in hexadecimal.'

export function AttackSection() {
  const [operation, setOperation] = useState<Operation>('encrypt')
  const [message1, setMessage1] = useState(EXAMPLE.encrypt.message1)
  const [message2, setMessage2] = useState(EXAMPLE.encrypt.message2)
  const [ciphertext1, setCiphertext1] = useState(EXAMPLE.decrypt.ciphertext1)
  const [ciphertext2, setCiphertext2] = useState(EXAMPLE.decrypt.ciphertext2)

  /* ---- the key: yours, or a random one reused on purpose -------------- */
  const [key, setKey] = useState(EXAMPLE_KEY)
  const [keyFormat, setKeyFormat] = useState<InputFormat>('text')
  const [otpMode, setOtpMode] = useState(false)
  const [randomRecord, setRandomRecord] = useState<OtpKeyRecord | null>(null)
  const [randomError, setRandomError] = useState<string | null>(null)
  const [otpRevealed, setOtpRevealed] = useState(false)
  /** Key produced by the last Encrypt run, so Decrypt works out of the box. */
  const [sessionKey, setSessionKey] = useState('')

  const [exerciseMode, setExerciseMode] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  const [result, setResult] = useState<AttackResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cases = useMemo(() => attackTestCasesFor(operation), [operation])
  const [caseIndex, setCaseIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [checked, setChecked] = useState<CheckResult | null>(null)
  const [checkedQuestion, setCheckedQuestion] = useState<ExerciseQuestion | null>(null)

  const isEncrypt = operation === 'encrypt'
  const stepsVisible = showSteps && (!exerciseMode || checked !== null)
  const redactKey = otpMode && randomRecord !== null && !otpRevealed
  const steps = useMemo(
    () => (result ? buildAttackSteps(result, { redactKey }) : []),
    [result, redactKey],
  )

  /* ---- derived --------------------------------------------------------- */
  const manualKey = useMemo(() => {
    try {
      return parseToBytes(key, keyFormat, 'key')
    } catch {
      return null
    }
  }, [key, keyFormat])

  const messageLength = useMemo(() => {
    if (!isEncrypt) return 0
    const length1 = new TextEncoder().encode(message1).length
    return length1
  }, [isEncrypt, message1])

  /**
   * Bytes a key has to cover: the message when encrypting, the ciphertext when
   * decrypting. A one-time pad is exactly as long as the data it protects, so
   * both operations must be able to generate one.
   */
  const keyLength = useMemo(() => {
    if (isEncrypt) return messageLength
    try {
      return parseToBytes(ciphertext1, 'hex', 'ciphertext').length
    } catch {
      return 0
    }
  }, [isEncrypt, messageLength, ciphertext1])

  /** The key shown by the OTP panel, so the run and the panel always agree. */
  const randomKey = useMemo(() => {
    if (!randomRecord) return null
    try {
      return parseToBytes(randomRecord.hex, 'hex', 'key')
    } catch {
      return null
    }
  }, [randomRecord])

  /** The key that will actually be reused, however it was supplied. */
  const activeKeyHex = otpMode
    ? (randomRecord?.hex ?? sessionKey)
    : manualKey
      ? bytesToHex(manualKey)
      : sessionKey

  const keyPlan = useMemo(() => {
    if (otpMode || messageLength === 0 || !manualKey) return null
    if (manualKey.length === 0) return null
    return applyKey(manualKey, messageLength)
  }, [otpMode, manualKey, messageLength])

  const liveError = useMemo(() => {
    if (exerciseMode) return null
    if (isEncrypt) {
      if (message1.length === 0 || message2.length === 0) return 'Please enter both messages.'
      const length1 = new TextEncoder().encode(message1).length
      const length2 = new TextEncoder().encode(message2).length
      if (length1 !== length2)
        return `Both messages must have the same length in bytes (${length1} vs ${length2}) so one key can cover both.`
    }
    if (activeKeyHex.length === 0) {
      if (otpMode) return 'Generate a random key first. It is reused for both messages.'
      try {
        parseToBytes(key, keyFormat, 'key')
      } catch (parseError) {
        return toMessage(parseError, 'Invalid key.')
      }
      return 'Please enter a key.'
    }
    return null
  }, [exerciseMode, isEncrypt, message1, message2, activeKeyHex, otpMode, key, keyFormat])

  const questionInput = useMemo(
    () => ({
      operation,
      message1,
      message2,
      ciphertext1,
      ciphertext2,
      // OTP Mode grades with the generated key, not with the typed one.
      key: otpMode ? randomKey : (manualKey ?? null),
      otpMode,
    }),
    [operation, message1, message2, ciphertext1, ciphertext2, manualKey, randomKey, otpMode],
  )
  /** Structure only, so this is safe to render while typing. */
  const outline = useMemo(() => buildAttackOutline(questionInput), [questionInput])
  const question = checkedQuestion ?? outline

  /* ---- actions --------------------------------------------------------- */
  const run = useCallback(() => {
    setError(null)
    setBusy(true)
    try {
      if (isEncrypt) {
        const next = runKeyReuseAttack({
          message1,
          message2,
          otpMode,
          // The key from the OTP panel, never a fresh one, so both always match.
          key: otpMode ? (randomKey ?? undefined) : (manualKey ?? undefined),
          keyLabel: otpMode
            ? 'Random OTP Key (reused on purpose)'
            : 'Your Key (reused on purpose)',
        })
        setResult(next)
        setSessionKey(next.keyHex)
        setCiphertext1(bytesToHex(next.c1))
        setCiphertext2(bytesToHex(next.c2))
      } else {
        const next = runKeyReuseDecrypt({
          ciphertext1,
          ciphertext2,
          keyHex: activeKeyHex,
        })
        setResult(next)
      }
    } catch (runError) {
      setResult(null)
      setError(toMessage(runError, 'The demonstration failed.'))
    } finally {
      setBusy(false)
    }
  }, [
    isEncrypt,
    message1,
    message2,
    otpMode,
    manualKey,
    randomKey,
    ciphertext1,
    ciphertext2,
    activeKeyHex,
  ])

  const checkExercise = useCallback(() => {
    setError(null)
    try {
      // Expected values are computed here, from the live inputs, and nowhere else.
      const full = buildAttackQuestion(questionInput)
      setCheckedQuestion(full)
      setChecked(checkAnswer(full, answers))
    } catch (buildError) {
      setChecked(null)
      setCheckedQuestion(null)
      setError(toMessage(buildError, 'Fix the input before checking your answer.'))
    }
  }, [questionInput, answers])

  const generateRandom = useCallback(() => {
    setRandomError(null)
    if (keyLength === 0) return
    const bytes = generateRandomKey(keyLength)
    setRandomRecord({
      hex: bytesToHex(bytes),
      spaced: bytesToHexSpaced(bytes),
      length: keyLength,
      issuedAt: Date.now(),
      usedAt: null,
      otpStyle: true,
    })
    setOtpRevealed(false)
  }, [keyLength])

  const changeOperation = useCallback((next: Operation) => {
    setOperation(next)
    setResult(null)
    setError(null)
    setCaseIndex(0)
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

  const changeOtpMode = useCallback((enabled: boolean) => {
    setOtpMode(enabled)
    setError(null)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [])

  const loadExample = useCallback((testCase: AttackTestCase, position: number) => {
    setCaseIndex(position)
    setOperation(testCase.operation)
    if (testCase.operation === 'encrypt') {
      setMessage1(testCase.message1)
      setMessage2(testCase.message2)
    }
    setKey(testCase.key)
    setKeyFormat('hex')
    setOtpMode(false)
    setResult(null)
    setError(null)
    setAnswers({})
    setChecked(null)
    setCheckedQuestion(null)
  }, [])

  const stepCase = useCallback(
    (direction: 1 | -1) => {
      const next = Math.min(Math.max(caseIndex + direction, 0), cases.length - 1)
      const testCase = cases[next]
      if (testCase) loadExample(testCase, next)
    },
    [caseIndex, cases, loadExample],
  )

  return (
    <section id="security" className="scroll-mt-24 py-14 sm:py-20">
      <SectionHeader
        index="02"
        eyebrow="Why key reuse breaks everything"
        icon={<Swords size={20} aria-hidden="true" />}
        title="Security / Key Reuse Attack"
        description={
          <p>
            Two messages, one key:{' '}
            <code className="font-mono text-accent">C1 XOR C2 = M1 XOR M2</code>. That equation is
            never the key.
          </p>
        }
      />

      <div className="glass card-hover rounded-3xl p-4 sm:p-6 lg:p-7">
        <div
          className="flex flex-col gap-3 border-b border-line/10 pb-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="label">Operation</p>
          <Segmented<Operation>
            label="Attack operation"
            tone="warn"
            value={operation}
            onChange={changeOperation}
            options={[
              { value: 'encrypt', label: 'Encrypt' },
              { value: 'decrypt', label: 'Decrypt' },
            ]}
          />
        </div>

        {/* ---------- the inputs: same in both modes ---------- */}
        <div className="grid gap-4 pt-5 lg:grid-cols-2">
          {isEncrypt ? (
            <>
              <TextField
                label="Message 1"
                value={message1}
                onChange={setMessage1}
                placeholder="ATTACK AT DAWN"
                meta={`${new TextEncoder().encode(message1).length} bytes`}
              />
              <TextField
                label="Message 2"
                value={message2}
                onChange={setMessage2}
                placeholder="DEFEND WALLS!!"
                meta={`${new TextEncoder().encode(message2).length} bytes`}
                hint="Same byte length as message 1."
              />
            </>
          ) : (
            <>
              <TextField
                label="Ciphertext 1"
                value={ciphertext1}
                onChange={setCiphertext1}
                placeholder="1B3B24C0D1E8948482C7BC48F6FC"
                meta={`${(ciphertext1.replace(/\s/g, '').length / 2) | 0} bytes`}
              />
              <TextField
                label="Ciphertext 2"
                value={ciphertext2}
                onChange={setCiphertext2}
                placeholder="1E2A36C4DCE7949297ABB45A8093"
                meta={`${(ciphertext2.replace(/\s/g, '').length / 2) | 0} bytes`}
                hint="Same byte length as ciphertext 1."
              />
            </>
          )}

          <div className="flex flex-col gap-3.5 lg:col-span-2">
            {otpMode ? (
              <OtpKeyPanel
                variant="attack"
                messageLength={keyLength}
                record={randomRecord}
                onGenerate={generateRandom}
                onRevealChange={setOtpRevealed}
                busy={busy}
                error={randomError}
                emptyHint={
                  isEncrypt
                    ? 'Enter both messages first: a random key is generated to their exact byte length.'
                    : 'Enter the ciphertext first: a random key is generated to its exact byte length.'
                }
              />
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <TextField
                  label="Key (reused for both messages)"
                  value={key}
                  onChange={setKey}
                  placeholder="NIGHTFALL"
                  meta={manualKey ? `${manualKey.length} bytes` : ''}
                  hint="Short keys repeat, long keys are trimmed."
                />
                <FormatSelect<InputFormat>
                  id="attack-key-format"
                  label="Key format"
                  value={keyFormat}
                  options={KEY_FORMATS}
                  onChange={setKeyFormat}
                />
              </div>
            )}
            {!otpMode ? <KeyPlanNote plan={keyPlan} /> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AttackToggles
            otpMode={otpMode}
            exerciseMode={exerciseMode}
            showSteps={showSteps}
            onOtp={changeOtpMode}
            onExercise={changeExerciseMode}
            onSteps={setShowSteps}
          />
          <div className="sm:col-span-3 sm:flex sm:items-end sm:justify-center">
            {exerciseMode ? (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={checkExercise}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Check Answer
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-full sm:w-auto"
                  onClick={() => {
                    setAnswers({})
                    setChecked(null)
                    setCheckedQuestion(null)
                  }}
                >
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={run}
                  disabled={busy || liveError !== null}
                  title={liveError ?? undefined}
                >
                  {busy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
                  {isEncrypt ? 'Encrypt' : 'Decrypt'}
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
              onCheck={checkExercise}
              onReset={() => {
                setAnswers({})
                setChecked(null)
                setCheckedQuestion(null)
              }}
              onStep={stepCase}
              index={Math.min(caseIndex, cases.length - 1)}
              total={cases.length}
              heading="Input your answer"
              eyebrow="Exercise Mode"
              tools={<ExampleLoader cases={cases} index={caseIndex} onLoad={loadExample} />}
            />
            {showSteps && !checked ? (
              <p className="mt-3 rounded-xl border border-dashed border-line/20 px-4 py-3 text-center text-xs text-faint">
                The step-by-step breakdown stays hidden until you check your answer.
              </p>
            ) : null}
          </div>
        ) : result ? (
          <div className="mt-5 space-y-4">
            {otpMode && isEncrypt ? (
              <Alert tone="warn" title="⚠ OTP Key Reuse Detected" pulse>
                <p>One key encrypted two messages, which is exactly what a One-Time Pad forbids.</p>
              </Alert>
            ) : null}

            <IdentityPanel result={result} redactKey={redactKey} />

            {stepsVisible ? (
              <StepsPanel
                steps={steps}
                renderExtra={(step) =>
                  step.id === 3 ? <AttackTable rows={result.rows} /> : null
                }
              />
            ) : (
              <CodeBlock tone="accent">{compactIdentity()}</CodeBlock>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <KnownPlaintextCard
          // Remount on a new identity so the fields are refilled from the demo.
          key={`${isEncrypt ? message1 : 'decrypt'}|${ciphertext1}|${ciphertext2}`}
          message1={isEncrypt ? message1 : 'ATTACK AT DAWN'}
          ciphertext1={isEncrypt && result ? bytesToHex(result.c1) : ciphertext1}
          ciphertext2={isEncrypt && result ? bytesToHex(result.c2) : ciphertext2}
        />
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

function AttackToggles({
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
        id="attack-otp-mode"
        checked={otpMode}
        onChange={onOtp}
        tone="violet"
        label="OTP Mode"
        icon={<ShieldCheck size={15} aria-hidden="true" />}
        description="A random key, reused on purpose."
      />
      <Toggle
        id="attack-exercise-mode"
        checked={exerciseMode}
        onChange={onExercise}
        label="Exercise Mode"
        icon={<FlaskConical size={15} aria-hidden="true" />}
        description="Type the result and grade yourself."
      />
      <Toggle
        id="attack-show-steps"
        checked={showSteps}
        onChange={onSteps}
        label="Show Steps"
        icon={<BookOpen size={15} aria-hidden="true" />}
        description="M1 ⊕ K, M2 ⊕ K, then the cancellation."
      />
    </>
  )
}

/** Optional one-click starting points for the live exercise. */
function ExampleLoader({
  cases,
  index,
  onLoad,
}: {
  cases: AttackTestCase[]
  index: number
  onLoad: (testCase: AttackTestCase, position: number) => void
}) {
  return (
    <div className="rounded-xl border border-line/12 bg-canvas/30 p-3">
      <p className="label">Worked examples (optional)</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cases.map((testCase, position) => (
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

function KeyPlanNote({ plan }: { plan: ReturnType<typeof applyKey> | null }) {
  if (!plan || plan.usage.mode === 'exact') return null
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

function IdentityPanel({
  result,
  redactKey,
}: {
  result: AttackResult
  redactKey: boolean
}) {
  const keyHex = redactKey ? '•'.repeat(result.keyHex.length) : result.keyHex
  const recovered = 'm1Text' in result

  return (
    <div className="rounded-2xl border border-line/12 bg-canvas/30 p-4 sm:p-5">
      <DataRow
        label={result.keyLabel ?? (recovered ? 'Session Key' : 'Generated Key')}
        value={keyHex}
        copyValue={redactKey ? '' : result.keyHex}
        copyLabel="attack-key"
        tone="accent"
      />
      {recovered ? (
        <>
          <DataRow
            label="Message 1"
            value={result.m1Text ?? bytesToHexSpaced(result.m1)}
            copyValue={result.m1Text ?? bytesToHex(result.m1)}
            copyLabel="attack-m1"
            tone="ok"
            note={result.m1Text === null ? NOT_TEXT_NOTE : undefined}
          />
          <DataRow
            label="Message 2"
            value={result.m2Text ?? bytesToHexSpaced(result.m2)}
            copyValue={result.m2Text ?? bytesToHex(result.m2)}
            copyLabel="attack-m2"
            tone="ok"
            note={result.m2Text === null ? NOT_TEXT_NOTE : undefined}
          />
        </>
      ) : (
        <>
          <DataRow
            label="Ciphertext 1"
            value={bytesToHex(result.c1)}
            copyValue={bytesToHex(result.c1)}
            copyLabel="attack-c1"
          />
          <DataRow
            label="Ciphertext 2"
            value={bytesToHex(result.c2)}
            copyValue={bytesToHex(result.c2)}
            copyLabel="attack-c2"
          />
        </>
      )}
      <DataRow
        label="C1 XOR C2"
        value={bytesToHex(result.c1XorC2)}
        copyValue={bytesToHex(result.c1XorC2)}
        copyLabel="attack-c1x"
        tone="warn"
      />
      <DataRow
        label="M1 XOR M2"
        value={bytesToHex(result.m1XorM2)}
        copyValue={bytesToHex(result.m1XorM2)}
        copyLabel="attack-m1x"
        tone="warn"
      />

      <div className="mt-3 space-y-2.5">
        <div
          className={`rounded-xl border px-3.5 py-3 ${
            result.identityHolds
              ? 'border-ok/40 bg-ok/10 text-ok'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
        >
          <p className="font-mono text-[13px] font-bold">
            {result.identityHolds ? '✓ C1 XOR C2 = M1 XOR M2' : '✗ Identity failed'}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            <span className="font-mono">K XOR K = 0</span>: the key is gone, and only a relation
            between the two plaintexts is left.
          </p>
        </div>
        <div className="rounded-xl border border-danger/35 bg-danger/8 px-3.5 py-3">
          <p className="flex items-center gap-2 font-mono text-[12.5px] font-bold text-danger">
            <ShieldAlert size={15} aria-hidden="true" />
            C1 XOR C2 is NOT the key
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            The result is <span className="font-mono">M1 XOR M2</span>, nothing more.
          </p>
        </div>
      </div>
    </div>
  )
}

function compactIdentity(): string {
  return [
    'C1 = M1 XOR K',
    'C2 = M2 XOR K',
    '',
    'C1 XOR C2 = M1 XOR M2   (K XOR K = 0, the key is gone)',
  ].join('\n')
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas"
    />
  )
}
