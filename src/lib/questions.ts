/**
 * Builds exercise questions from whatever is currently in the form.
 *
 * Exercise Mode is the *same* cipher as normal mode. The only addition is a set
 * of answer fields the student fills in. The question therefore describes the
 * live input, not a fixed test case, and it is built in two flavours:
 *
 *  - `buildXorOutline` / `buildAttackOutline` carry the field *structure* only
 *    (labels, formats, hints) and no expected values at all. They are safe to
 *    keep in React state while the student types.
 *  - `buildXorQuestion` / `buildAttackQuestion` additionally compute the correct
 *    answers. They are called from the click handler of "Check answer" and
 *    their result is stored at the same moment the check is stored, so the
 *    expected values can never appear before the student answered.
 */
import { bytesToBase64, bytesToBinary, bytesToHex, bytesToHexSpaced, formatBytes } from './bytes'
import { parseToBytes } from './parse'
import { runKeyReuseAttack, runKeyReuseDecrypt } from './attack'
import { INPUT_FORMAT_LABEL, operationLabels, runXor } from './pipeline'
import type { ExerciseQuestion } from './exercise'
import type { AnswerFormat, CipherOutputFormat, InputFormat, Operation } from './types'

export interface XorQuestionInput {
  operation: Operation
  input: string
  inputFormat: InputFormat
  key: string
  keyFormat: InputFormat
  outputFormat: CipherOutputFormat
  /** Representation the student answers in. Defaults to the natural one. */
  answerFormat: AnswerFormat
  /**
   * OTP mode: the key is still graded, but every view of it is masked once the
   * demonstration countdown has ended, exactly as the steps and the output do.
   */
  redactKey?: boolean
}

/** Plaintext is answered as text, ciphertext as hexadecimal. */
export function defaultAnswerFormat(operation: Operation): AnswerFormat {
  return operation === 'encrypt' ? 'hex' : 'text'
}

/** Ciphertext has no text form, so an encrypt answer can only be hex or binary. */
function answerOptions(operation: Operation): AnswerFormat[] {
  return operation === 'encrypt' ? ['hex', 'binary'] : ['text', 'hex', 'binary']
}

const ANSWER_PLACEHOLDER: Record<AnswerFormat, string> = {
  text: 'the recovered message',
  hex: '48 45 4C 4C 4F',
  binary: '01001000 01000101 01001100',
  base64: 'CQcPCAo=',
}

/** Placeholder used wherever an OTP key must not be rendered. */
function keyMask(length: number): string {
  return '\u2022'.repeat(Math.max(length, 2))
}

function xorFields(input: XorQuestionInput): ExerciseQuestion['fields'] {
  const labels = operationLabels(input.operation)
  const options = answerOptions(input.operation)
  const format = options.includes(input.answerFormat)
    ? input.answerFormat
    : defaultAnswerFormat(input.operation)
  return [
    {
      key: 'answer',
      label: labels.output,
      format,
      options,
      placeholder: ANSWER_PLACEHOLDER[format],
      hint: 'XOR the input with the key, byte by byte.',
    },
  ]
}

function xorPrompt(input: XorQuestionInput): ExerciseQuestion['prompt'] {
  const labels = operationLabels(input.operation)
  let inputLength = 0
  let keyLength = 0
  try {
    inputLength = parseToBytes(
      input.input,
      input.inputFormat,
      input.operation === 'encrypt' ? 'plaintext' : 'ciphertext',
    ).length
  } catch {
    inputLength = 0
  }
  try {
    keyLength = parseToBytes(input.key, input.keyFormat, 'key').length
  } catch {
    keyLength = 0
  }

  return [
    {
      label: labels.input,
      value: input.input,
      note: INPUT_FORMAT_LABEL[input.inputFormat],
    },
    input.redactKey
      ? { label: 'Key', value: 'hidden', note: 'reveal the OTP key to see it' }
      : { label: 'Key', value: input.key, note: INPUT_FORMAT_LABEL[input.keyFormat] },
    {
      label: 'Key vs input',
      value:
        keyLength === 0 || inputLength === 0
          ? ''
          : `${keyLength} vs ${inputLength} ${inputLength === 1 ? 'byte' : 'bytes'}`,
      note:
        keyLength === 0 || inputLength === 0
          ? undefined
          : keyLength < inputLength
            ? 'key repeats'
            : keyLength > inputLength
              ? 'key truncates'
              : 'exact fit',
    },
  ]
}

/** Field structure only. No expected values, safe to render while typing. */
export function buildXorOutline(input: XorQuestionInput): ExerciseQuestion {
  return {
    id: 0,
    title: 'Your inputs',
    subtitle: 'Work it by hand, then type the result. Nothing is revealed until you check.',
    prompt: xorPrompt(input),
    fields: xorFields(input),
    reveal: [],
  }
}

/** Full question, expected values included. Call this from the check handler. */
export function buildXorQuestion(input: XorQuestionInput): ExerciseQuestion {
  const base = buildXorOutline(input)
  const result = runXor(input)
  const labels = operationLabels(input.operation)
  const field = base.fields[0]
  const expected =
    field.format === 'text'
      ? result.outputLooseText
      : formatBytes(result.outputBytes, field.format)

  return {
    ...base,
    fields: [{ ...field, expected }],
    reveal: [
      { label: `${labels.input} bytes`, value: bytesToHexSpaced(result.inputBytes) },
      {
        label: 'Key bytes (as typed)',
        value: input.redactKey ? keyMask(result.keyBytes.length * 2) : bytesToHexSpaced(result.keyBytes),
      },
      {
        label: 'Key applied to every byte',
        value: input.redactKey
          ? keyMask(result.effectiveKey.length)
          : bytesToHexSpaced(result.effectiveKey),
      },
      { label: `${labels.output} bytes`, value: bytesToHexSpaced(result.outputBytes) },
      { label: `${labels.output} (hex)`, value: bytesToHex(result.outputBytes) },
      { label: `${labels.output} (binary)`, value: bytesToBinary(result.outputBytes) },
      { label: `${labels.output} (base64)`, value: bytesToBase64(result.outputBytes) },
      {
        label: 'First XOR rows',
        value: result.rows
          .slice(0, 3)
          .map((row) =>
            input.redactKey
              ? `${row.messageHex} XOR ${keyMask(2)} = ${row.resultHex}`
              : `${row.messageHex} XOR ${row.keyHex} = ${row.resultHex}`,
          )
          .join('\n'),
      },
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* Attack                                                                     */
/* -------------------------------------------------------------------------- */

export interface AttackQuestionInput {
  operation: Operation
  message1: string
  message2: string
  ciphertext1: string
  ciphertext2: string
  /** Key as typed, already parsed to bytes. `null` means "generate a random one". */
  key: Uint8Array | null
  otpMode: boolean
}

export function buildAttackOutline(input: AttackQuestionInput): ExerciseQuestion {
  const isEncrypt = input.operation === 'encrypt'
  return {
    id: 0,
    title: 'Your inputs',
    subtitle: isEncrypt
      ? 'Encrypt both messages with the same key, then work out C1 XOR C2.'
      : 'Decrypt both ciphertexts with the same key, then work out C1 XOR C2.',
    prompt: [
      isEncrypt
        ? { label: 'Message 1', value: input.message1, note: 'text' }
        : { label: 'Ciphertext 1', value: input.ciphertext1, note: 'hex' },
      isEncrypt
        ? { label: 'Message 2', value: input.message2, note: 'text' }
        : { label: 'Ciphertext 2', value: input.ciphertext2, note: 'hex' },
      { label: 'Key', value: input.key ? bytesToHex(input.key) : 'random key' },
    ],
    fields: attackFields(input),
    reveal: [],
  }
}

function attackFields(input: AttackQuestionInput): ExerciseQuestion['fields'] {
  if (input.operation === 'encrypt') {
    return [
      {
        key: 'ciphertext1',
        label: 'Ciphertext 1',
        format: 'hex',
        placeholder: '1B3B24C0…',
        hint: 'M1 XOR K in hexadecimal.',
      },
      {
        key: 'ciphertext2',
        label: 'Ciphertext 2',
        format: 'hex',
        placeholder: '1E2A36C4…',
        hint: 'M2 with the same key. That is the mistake.',
      },
      {
        key: 'xor',
        label: 'C1 XOR C2',
        format: 'hex',
        placeholder: '05111204…',
        hint: 'The key cancels: this is M1 XOR M2, never the key.',
      },
    ]
  }
  return [
    {
      key: 'message1',
      label: 'Message 1',
      format: 'text',
      placeholder: 'the first message',
      hint: 'C1 XOR K. XOR is its own inverse.',
    },
    {
      key: 'message2',
      label: 'Message 2',
      format: 'text',
      placeholder: 'the second message',
      hint: 'C2 XOR K, same key.',
    },
    {
      key: 'xor',
      label: 'C1 XOR C2',
      format: 'hex',
      placeholder: '05111204…',
      hint: 'Independent of the key: it equals M1 XOR M2.',
    },
  ]
}

export function buildAttackQuestion(input: AttackQuestionInput): ExerciseQuestion {
  const base = buildAttackOutline(input)
  const isEncrypt = input.operation === 'encrypt'
  const key = input.key ?? undefined

  const result = isEncrypt
    ? runKeyReuseAttack({
        message1: input.message1,
        message2: input.message2,
        otpMode: input.otpMode,
        key,
      })
    : runKeyReuseDecrypt({
        ciphertext1: input.ciphertext1,
        ciphertext2: input.ciphertext2,
        keyHex: key ? bytesToHex(key) : '',
      })

  const expected: Record<string, string> = isEncrypt
    ? {
        ciphertext1: bytesToHex(result.c1),
        ciphertext2: bytesToHex(result.c2),
        xor: bytesToHex(result.c1XorC2),
      }
    : {
        message1: 'm1Text' in result ? (result.m1Text ?? '') : '',
        message2: 'm1Text' in result ? (result.m2Text ?? '') : '',
        xor: bytesToHex(result.c1XorC2),
      }

  return {
    ...base,
    fields: base.fields.map((field) => ({ ...field, expected: expected[field.key] ?? '' })),
    reveal: [
      { label: 'Key used', value: result.keyHex },
      { label: 'C1', value: bytesToHex(result.c1) },
      { label: 'C2', value: bytesToHex(result.c2) },
      { label: 'C1 XOR C2', value: bytesToHex(result.c1XorC2) },
      { label: 'M1 XOR M2', value: bytesToHex(result.m1XorM2) },
      {
        label: 'Identity',
        value: result.identityHolds
          ? 'C1 XOR C2 = M1 XOR M2  ✓  (the key is not recoverable this way)'
          : 'Identity failed, which should never happen.',
      },
      {
        label: 'K XOR K',
        value: `${'00'.repeat(result.effectiveKey.length)}  (all zero bits, the key vanishes)`,
      },
    ],
  }
}
